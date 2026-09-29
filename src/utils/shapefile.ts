import JSZip from 'jszip';

export interface GeoJsonFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: any;
  };
  properties?: Record<string, any>;
}

export interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

const WGS84_PRJ = 'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]]';

/**
 * Normalizes coordinates into an array of rings (where each ring is [lng, lat][])
 */
function extractRingsFromGeometry(geom: any): number[][][] {
  if (!geom || !geom.coordinates) return [];
  if (geom.type === 'Polygon') {
    return geom.coordinates;
  }
  if (geom.type === 'MultiPolygon') {
    const rings: number[][][] = [];
    for (const poly of geom.coordinates) {
      for (const ring of poly) {
        rings.push(ring);
      }
    }
    return rings;
  }
  return [];
}

/**
 * Creates ESRI Shapefile (.shp, .shx, .dbf, .prj, .cpg) and packages into ZIP Buffer
 */
export async function createShapefileZip(
  featureCollection: GeoJsonFeatureCollection,
  baseName: string = 'kkpr_osm_layer'
): Promise<Buffer> {
  const features = featureCollection.features || [];

  // 1. Calculate overall bounding box
  let globalMinX = 180, globalMinY = 90, globalMaxX = -180, globalMaxY = -90;

  interface PolyRecord {
    box: [number, number, number, number]; // [minX, minY, maxX, maxY]
    parts: number[];
    points: [number, number][];
    properties: Record<string, any>;
  }

  const polyRecords: PolyRecord[] = [];

  for (const feat of features) {
    const rings = extractRingsFromGeometry(feat.geometry);
    if (!rings || rings.length === 0) continue;

    let recMinX = 180, recMinY = 90, recMaxX = -180, recMaxY = -90;
    const parts: number[] = [];
    const points: [number, number][] = [];

    for (const ring of rings) {
      if (ring.length < 3) continue;
      parts.push(points.length);

      // Ensure ring is closed
      const closedRing = [...ring];
      const first = closedRing[0];
      const last = closedRing[closedRing.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        closedRing.push([first[0], first[1]]);
      }

      for (const pt of closedRing) {
        const x = Number(pt[0]);
        const y = Number(pt[1]);
        if (x < recMinX) recMinX = x;
        if (y < recMinY) recMinY = y;
        if (x > recMaxX) recMaxX = x;
        if (y > recMaxY) recMaxY = y;
        points.push([x, y]);
      }
    }

    if (points.length === 0) continue;

    if (recMinX < globalMinX) globalMinX = recMinX;
    if (recMinY < globalMinY) globalMinY = recMinY;
    if (recMaxX > globalMaxX) globalMaxX = recMaxX;
    if (recMaxY > globalMaxY) globalMaxY = recMaxY;

    polyRecords.push({
      box: [recMinX, recMinY, recMaxX, recMaxY],
      parts,
      points,
      properties: feat.properties || {},
    });
  }

  if (polyRecords.length === 0) {
    // Default dummy bbox if empty
    globalMinX = 0; globalMinY = 0; globalMaxX = 0; globalMaxY = 0;
  }

  // 2. Build .shp and .shx buffers
  // Calculate total shp size
  let shpContentLengthWords = 50; // 100 bytes header = 50 16-bit words
  const recordHeaders: { offsetWords: number; lengthWords: number }[] = [];

  for (const rec of polyRecords) {
    const contentLengthBytes =
      4 + // shapeType (int32)
      32 + // box (4 doubles)
      4 + // numParts (int32)
      4 + // numPoints (int32)
      rec.parts.length * 4 + // parts
      rec.points.length * 16; // points (2 doubles each)

    const lengthWords = contentLengthBytes / 2;
    recordHeaders.push({
      offsetWords: shpContentLengthWords,
      lengthWords,
    });
    shpContentLengthWords += 4 + lengthWords; // +4 words for 8-byte record header
  }

  const shpTotalBytes = shpContentLengthWords * 2;
  const shpBuffer = Buffer.alloc(shpTotalBytes);

  // Write SHP Header
  shpBuffer.writeInt32BE(9994, 0); // File code
  shpBuffer.writeInt32BE(0, 4);
  shpBuffer.writeInt32BE(0, 8);
  shpBuffer.writeInt32BE(0, 12);
  shpBuffer.writeInt32BE(0, 16);
  shpBuffer.writeInt32BE(0, 20);
  shpBuffer.writeInt32BE(shpContentLengthWords, 24); // File length in words
  shpBuffer.writeInt32LE(1000, 28); // Version
  shpBuffer.writeInt32LE(5, 32); // Shape type 5 = Polygon
  shpBuffer.writeDoubleLE(globalMinX, 36);
  shpBuffer.writeDoubleLE(globalMinY, 44);
  shpBuffer.writeDoubleLE(globalMaxX, 52);
  shpBuffer.writeDoubleLE(globalMaxY, 60);
  shpBuffer.writeDoubleLE(0, 68); // Z min
  shpBuffer.writeDoubleLE(0, 76); // Z max
  shpBuffer.writeDoubleLE(0, 84); // M min
  shpBuffer.writeDoubleLE(0, 92); // M max

  // Write SHP Records
  let currentOffset = 100;
  for (let i = 0; i < polyRecords.length; i++) {
    const rec = polyRecords[i];
    const recMeta = recordHeaders[i];

    // 8-byte record header
    shpBuffer.writeInt32BE(i + 1, currentOffset);
    shpBuffer.writeInt32BE(recMeta.lengthWords, currentOffset + 4);
    currentOffset += 8;

    // Record content
    shpBuffer.writeInt32LE(5, currentOffset); // Polygon shapeType
    shpBuffer.writeDoubleLE(rec.box[0], currentOffset + 4);
    shpBuffer.writeDoubleLE(rec.box[1], currentOffset + 12);
    shpBuffer.writeDoubleLE(rec.box[2], currentOffset + 20);
    shpBuffer.writeDoubleLE(rec.box[3], currentOffset + 28);
    shpBuffer.writeInt32LE(rec.parts.length, currentOffset + 36);
    shpBuffer.writeInt32LE(rec.points.length, currentOffset + 40);
    currentOffset += 44;

    for (const part of rec.parts) {
      shpBuffer.writeInt32LE(part, currentOffset);
      currentOffset += 4;
    }

    for (const pt of rec.points) {
      shpBuffer.writeDoubleLE(pt[0], currentOffset);
      shpBuffer.writeDoubleLE(pt[1], currentOffset + 8);
      currentOffset += 16;
    }
  }

  // 3. Build .shx buffer
  const shxContentLengthWords = 50 + polyRecords.length * 4;
  const shxBuffer = Buffer.alloc(shxContentLengthWords * 2);

  // SHX Header is identical to SHP header except length
  shpBuffer.copy(shxBuffer, 0, 0, 100);
  shxBuffer.writeInt32BE(shxContentLengthWords, 24);

  let shxOffset = 100;
  for (const recMeta of recordHeaders) {
    shxBuffer.writeInt32BE(recMeta.offsetWords, shxOffset);
    shxBuffer.writeInt32BE(recMeta.lengthWords, shxOffset + 4);
    shxOffset += 8;
  }

  // 4. Build .dbf buffer (Attributes table)
  // Gather field definitions
  const sampleFields = [
    { name: 'KODE_KKPR', type: 'C', length: 30 },
    { name: 'KEGIATAN', type: 'C', length: 60 },
    { name: 'PEMOHON', type: 'C', length: 50 },
    { name: 'NO_IZIN', type: 'C', length: 50 },
    { name: 'KATEGORI', type: 'C', length: 40 },
    { name: 'LUAS_M2', type: 'N', length: 16, decimals: 2 },
    { name: 'STATUS', type: 'C', length: 25 },
  ];

  const recordLength = 1 + sampleFields.reduce((sum, f) => sum + f.length, 0);
  const headerLength = 32 + sampleFields.length * 32 + 1;
  const dbfTotalLength = headerLength + polyRecords.length * recordLength + 1;
  const dbfBuffer = Buffer.alloc(dbfTotalLength);

  // DBF Header
  const now = new Date();
  dbfBuffer.writeUInt8(0x03, 0); // dBASE III
  dbfBuffer.writeUInt8(now.getFullYear() - 1900, 1);
  dbfBuffer.writeUInt8(now.getMonth() + 1, 2);
  dbfBuffer.writeUInt8(now.getDate(), 3);
  dbfBuffer.writeUInt32LE(polyRecords.length, 4); // Number of records
  dbfBuffer.writeUInt16LE(headerLength, 8);
  dbfBuffer.writeUInt16LE(recordLength, 10);

  // Field descriptors
  let fOffset = 32;
  for (const field of sampleFields) {
    const nameBuf = Buffer.from(field.name, 'ascii');
    nameBuf.copy(dbfBuffer, fOffset, 0, Math.min(10, nameBuf.length));
    dbfBuffer.write(field.type, fOffset + 11, 1, 'ascii');
    dbfBuffer.writeUInt8(field.length, fOffset + 16);
    dbfBuffer.writeUInt8(field.decimals || 0, fOffset + 17);
    fOffset += 32;
  }
  dbfBuffer.writeUInt8(0x0D, fOffset); // Header terminator

  // DBF Records
  let rOffset = headerLength;
  for (const rec of polyRecords) {
    dbfBuffer.writeUInt8(0x20, rOffset); // Active record flag (space)
    let fieldValOffset = rOffset + 1;

    for (const field of sampleFields) {
      const p = rec.properties;
      let rawVal = '';
      if (field.name === 'KODE_KKPR') rawVal = String(p.kodeKkpr || p.kode || p.id || '');
      else if (field.name === 'KEGIATAN') rawVal = String(p.namaKegiatan || p.nama || p.kegiatan || '');
      else if (field.name === 'PEMOHON') rawVal = String(p.pemohon || p.pemilik || '');
      else if (field.name === 'NO_IZIN') rawVal = String(p.nomorIzin || p.izin || '');
      else if (field.name === 'KATEGORI') rawVal = String(p.kategori || '');
      else if (field.name === 'LUAS_M2') rawVal = (Number(p.luasRencana || p.luas || 0)).toFixed(2);
      else if (field.name === 'STATUS') rawVal = String(p.status || '');

      let strVal = rawVal.slice(0, field.length);
      if (field.type === 'N') {
        strVal = strVal.padStart(field.length, ' ');
      } else {
        strVal = strVal.padEnd(field.length, ' ');
      }
      dbfBuffer.write(strVal, fieldValOffset, field.length, 'ascii');
      fieldValOffset += field.length;
    }
    rOffset += recordLength;
  }
  dbfBuffer.writeUInt8(0x1A, rOffset); // End of file terminator

  // 5. Package into ZIP
  const zip = new JSZip();
  const safeBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
  zip.file(`${safeBaseName}.shp`, shpBuffer);
  zip.file(`${safeBaseName}.shx`, shxBuffer);
  zip.file(`${safeBaseName}.dbf`, dbfBuffer);
  zip.file(`${safeBaseName}.prj`, WGS84_PRJ);
  zip.file(`${safeBaseName}.cpg`, 'UTF-8');

  return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/**
 * Converts GeoJSON FeatureCollection to standard KML
 */
export function exportToKML(
  featureCollection: GeoJsonFeatureCollection,
  docName: string = 'Aplikasi Gade - Pemetaan GIS'
): string {
  const features = featureCollection.features || [];
  let placemarksXml = '';

  for (const feat of features) {
    const props = feat.properties || {};
    const name = props.namaKegiatan || props.namaLokasi || props.kodeTanah || props.kodeKkpr || 'Batas Lahan';
    const desc = Object.entries(props)
      .filter(([k]) => typeof props[k] === 'string' || typeof props[k] === 'number')
      .map(([k, v]) => `<b>${k}:</b> ${v}`)
      .join('<br/>');

    const rings = extractRingsFromGeometry(feat.geometry);
    if (!rings || rings.length === 0) continue;

    // Use outer ring
    const outerRing = rings[0];
    const coordsStr = outerRing.map((c: any) => `${c[0]},${c[1]},0`).join(' ');

    placemarksXml += `
    <Placemark>
      <name><![CDATA[${name}]]></name>
      <description><![CDATA[${desc}]]></description>
      <Style>
        <LineStyle><color>ff0000ff</color><width>2</width></LineStyle>
        <PolyStyle><color>7f00ff00</color></PolyStyle>
      </Style>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordsStr}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name><![CDATA[${docName}]]></name>
    <open>1</open>${placemarksXml}
  </Document>
</kml>`;
}

/**
 * Parses KML string into a standard GeoJSON FeatureCollection
 */
export function parseKMLToGeoJSON(kmlString: string): GeoJsonFeatureCollection {
  const features: GeoJsonFeature[] = [];
  const placemarkRegex = /<Placemark[\s\S]*?<\/Placemark>/gi;
  const matches = kmlString.match(placemarkRegex) || [];

  for (const placemark of matches) {
    // Extract name
    const nameMatch = placemark.match(/<name>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/name>/i);
    const name = nameMatch ? nameMatch[1].trim() : 'Polygon Lahan';

    // Extract coordinates from Polygon / LinearRing
    const coordRegex = /<coordinates>([\s\S]*?)<\/coordinates>/gi;
    let coordMatch;
    const rings: number[][][] = [];

    while ((coordMatch = coordRegex.exec(placemark)) !== null) {
      const coordRaw = coordMatch[1].trim();
      const pointsRaw = coordRaw.split(/\s+/);
      const ring: number[][] = [];

      for (const p of pointsRaw) {
        const parts = p.split(',');
        if (parts.length >= 2) {
          const lng = parseFloat(parts[0]);
          const lat = parseFloat(parts[1]);
          if (!isNaN(lng) && !isNaN(lat)) {
            ring.push([lng, lat]);
          }
        }
      }

      if (ring.length >= 3) {
        rings.push(ring);
      }
    }

    if (rings.length > 0) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: rings,
        },
        properties: {
          name,
          kategori: 'KML Import',
        },
      });
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Parses uploaded ZIP buffer containing .shp into GeoJSON FeatureCollection
 */
export async function parseShapefileZip(zipBuffer: Buffer): Promise<GeoJsonFeatureCollection> {
  const zip = await JSZip.loadAsync(zipBuffer);
  let shpFile = Object.values(zip.files).find(f => f.name.toLowerCase().endsWith('.shp'));
  if (!shpFile) {
    throw new Error('Tidak ditemukan file .shp di dalam file ZIP yang diupload');
  }

  const shpBuffer = await shpFile.async('nodebuffer');
  if (shpBuffer.length < 100) {
    throw new Error('File .shp tidak valid atau terlalu kecil');
  }

  const fileCode = shpBuffer.readInt32BE(0);
  if (fileCode !== 9994) {
    throw new Error('Format Shapefile tidak valid (magic code mismatch)');
  }

  const features: GeoJsonFeature[] = [];
  let offset = 100;

  while (offset + 8 <= shpBuffer.length) {
    const recNum = shpBuffer.readInt32BE(offset);
    const contentLenWords = shpBuffer.readInt32BE(offset + 4);
    const contentLenBytes = contentLenWords * 2;
    offset += 8;

    if (offset + contentLenBytes > shpBuffer.length) break;

    const shapeType = shpBuffer.readInt32LE(offset);
    // Shape type 5 = Polygon
    if (shapeType === 5) {
      const numParts = shpBuffer.readInt32LE(offset + 36);
      const numPoints = shpBuffer.readInt32LE(offset + 40);

      let pOffset = offset + 44;
      const parts: number[] = [];
      for (let i = 0; i < numParts; i++) {
        parts.push(shpBuffer.readInt32LE(pOffset));
        pOffset += 4;
      }

      const points: [number, number][] = [];
      for (let i = 0; i < numPoints; i++) {
        const x = shpBuffer.readDoubleLE(pOffset);
        const y = shpBuffer.readDoubleLE(pOffset + 8);
        points.push([x, y]);
        pOffset += 16;
      }

      const rings: number[][][] = [];
      for (let i = 0; i < numParts; i++) {
        const start = parts[i];
        const end = i + 1 < numParts ? parts[i + 1] : points.length;
        const ring = points.slice(start, end);
        if (ring.length >= 3) {
          rings.push(ring);
        }
      }

      if (rings.length > 0) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: rings,
          },
          properties: {
            recNum,
            kategori: 'SHP Import',
          },
        });
      }
    }

    offset += contentLenBytes;
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}
