from __future__ import annotations

import argparse
import os
import struct
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

EMU_PER_INCH = 914400
TWIPS_PER_INCH = 1440


def png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as file:
      signature = file.read(8)
      if signature != b"\x89PNG\r\n\x1a\n":
          raise ValueError("El archivo no es un PNG valido.")
      length = struct.unpack(">I", file.read(4))[0]
      chunk_type = file.read(4)
      if chunk_type != b"IHDR" or length < 8:
          raise ValueError("No se pudo leer el encabezado PNG.")
      width, height = struct.unpack(">II", file.read(8))
      return width, height


def english_metric(width: int, height: int, max_width_in: float) -> tuple[int, int]:
    width_in = max_width_in
    height_in = (height / width) * width_in
    return int(width_in * EMU_PER_INCH), int(height_in * EMU_PER_INCH)


def write_zip(output_path: Path, files: dict[str, bytes]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in files.items():
            archive.writestr(name, content)


def build_docx(image_path: Path, output_path: Path, title: str) -> None:
    width, height = png_size(image_path)
    cx, cy = english_metric(width, height, max_width_in=10.1)
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    image_bytes = image_path.read_bytes()
    image_name = image_path.name
    image_ext = image_path.suffix.lower().lstrip(".")
    image_content_type = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
    }.get(image_ext)

    if image_content_type is None:
        raise ValueError("Solo se admiten imagenes PNG o JPG para el DOCX.")

    content_types = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="{image_ext}" ContentType="{image_content_type}"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>"""

    rels_root = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>"""

    doc_rels = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/{escape(image_name)}"/>
</Relationships>"""

    styles = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:rPr>
      <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
      <w:sz w:val="22"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:after="120"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display"/>
      <w:b/>
      <w:color w:val="16324F"/>
      <w:sz w:val="34"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Caption">
    <w:name w:val="Caption"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="80"/>
    </w:pPr>
    <w:rPr>
      <w:color w:val="5E7386"/>
      <w:sz w:val="18"/>
    </w:rPr>
  </w:style>
</w:styles>"""

    document = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
  <w:body>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Title"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r><w:t>{escape(title)}</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:drawing>
          <wp:inline distT="0" distB="0" distL="0" distR="0">
            <wp:extent cx="{cx}" cy="{cy}"/>
            <wp:docPr id="1" name="Behance slide"/>
            <a:graphic>
              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:pic>
                  <pic:nvPicPr>
                    <pic:cNvPr id="0" name="Behance poster"/>
                    <pic:cNvPicPr/>
                  </pic:nvPicPr>
                  <pic:blipFill>
                    <a:blip r:embed="rId2"/>
                    <a:stretch><a:fillRect/></a:stretch>
                  </pic:blipFill>
                  <pic:spPr>
                    <a:xfrm>
                      <a:off x="0" y="0"/>
                      <a:ext cx="{cx}" cy="{cy}"/>
                    </a:xfrm>
                    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                  </pic:spPr>
                </pic:pic>
              </a:graphicData>
            </a:graphic>
          </wp:inline>
        </w:drawing>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr><w:pStyle w:val="Caption"/></w:pPr>
      <w:r><w:t>Poster editorial con las pantallas principales de la aplicacion.</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>
      <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>"""

    core = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties
  xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>{escape(title)}</dc:title>
  <dc:creator>Codex</dc:creator>
  <cp:lastModifiedBy>Codex</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">{now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">{now}</dcterms:modified>
</cp:coreProperties>"""

    app = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties
  xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office Word</Application>
</Properties>"""

    files = {
        "[Content_Types].xml": content_types.encode("utf-8"),
        "_rels/.rels": rels_root.encode("utf-8"),
        "word/document.xml": document.encode("utf-8"),
        "word/styles.xml": styles.encode("utf-8"),
        "word/_rels/document.xml.rels": doc_rels.encode("utf-8"),
        "docProps/core.xml": core.encode("utf-8"),
        "docProps/app.xml": app.encode("utf-8"),
        f"word/media/{image_name}": image_bytes,
    }
    write_zip(output_path, files)


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera un DOCX sencillo con una imagen principal.")
    parser.add_argument("image", type=Path, help="Ruta de la imagen PNG/JPG a insertar.")
    parser.add_argument("output", type=Path, help="Ruta del archivo DOCX de salida.")
    parser.add_argument("--title", default="KiskeyaVet Behance Slide", help="Titulo del documento.")
    args = parser.parse_args()

    build_docx(args.image.resolve(), args.output.resolve(), args.title)
    print(os.fspath(args.output.resolve()))


if __name__ == "__main__":
    main()
