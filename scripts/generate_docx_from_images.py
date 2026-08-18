from __future__ import annotations

import argparse
import os
import struct
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from xml.sax.saxutils import escape

EMU_PER_INCH = 914400


@dataclass
class ImageSpec:
    path: Path
    width: int
    height: int
    ext: str


def png_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as file:
        signature = file.read(8)
        if signature != b"\x89PNG\r\n\x1a\n":
            raise ValueError(f"{path} no es un PNG valido.")
        _length = struct.unpack(">I", file.read(4))[0]
        chunk_type = file.read(4)
        if chunk_type != b"IHDR":
            raise ValueError(f"{path} no tiene encabezado PNG valido.")
        width, height = struct.unpack(">II", file.read(8))
        return width, height


def jpeg_size(path: Path) -> tuple[int, int]:
    with path.open("rb") as file:
        data = file.read()
    if not data.startswith(b"\xff\xd8"):
        raise ValueError(f"{path} no es un JPG valido.")
    idx = 2
    while idx < len(data):
        while idx < len(data) and data[idx] != 0xFF:
            idx += 1
        while idx < len(data) and data[idx] == 0xFF:
            idx += 1
        if idx >= len(data):
            break
        marker = data[idx]
        idx += 1
        if marker in {0xD8, 0xD9}:
            continue
        if idx + 2 > len(data):
            break
        length = struct.unpack(">H", data[idx:idx + 2])[0]
        if marker in {0xC0, 0xC1, 0xC2, 0xC3, 0xC9, 0xCA, 0xCB}:
            if idx + 7 > len(data):
                break
            height, width = struct.unpack(">HH", data[idx + 3:idx + 7])
            return width, height
        idx += length
    raise ValueError(f"No se pudo leer el tamano JPG de {path}.")


def read_image_spec(path: Path) -> ImageSpec:
    ext = path.suffix.lower().lstrip(".")
    if ext == "png":
        width, height = png_size(path)
    elif ext in {"jpg", "jpeg"}:
        width, height = jpeg_size(path)
    else:
        raise ValueError(f"Formato no soportado: {path.suffix}")
    return ImageSpec(path=path, width=width, height=height, ext=ext)


def to_emu(width: int, height: int, max_width_in: float) -> tuple[int, int]:
    width_in = max_width_in
    height_in = (height / width) * width_in
    return int(width_in * EMU_PER_INCH), int(height_in * EMU_PER_INCH)


def page_for_image(image: ImageSpec, image_rel_id: str, title: str, include_break: bool) -> str:
    cx, cy = to_emu(image.width, image.height, max_width_in=10.0)
    pieces = [
        '<w:p><w:pPr><w:pStyle w:val="Title"/><w:jc w:val="center"/></w:pPr>'
        f'<w:r><w:t>{escape(title)}</w:t></w:r></w:p>',
        '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing>'
        '<wp:inline distT="0" distB="0" distL="0" distR="0">'
        f'<wp:extent cx="{cx}" cy="{cy}"/>'
        '<wp:docPr id="1" name="Screen"/>'
        '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        '<pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="screen"/>'
        '<pic:cNvPicPr/></pic:nvPicPr><pic:blipFill>'
        f'<a:blip r:embed="{image_rel_id}"/>'
        '<a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm>'
        f'<a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/>'
        '</a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
        '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
    ]
    if include_break:
        pieces.append('<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
    return "".join(pieces)


def write_zip(output_path: Path, files: dict[str, bytes]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(output_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, content in files.items():
            archive.writestr(name, content)


def build_docx(images: list[Path], output_path: Path, deck_title: str) -> None:
    specs = [read_image_spec(path.resolve()) for path in images]
    now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

    content_type_defaults = [
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '<Default Extension="xml" ContentType="application/xml"/>',
    ]
    if any(spec.ext == "png" for spec in specs):
        content_type_defaults.append('<Default Extension="png" ContentType="image/png"/>')
    if any(spec.ext in {"jpg", "jpeg"} for spec in specs):
        content_type_defaults.append('<Default Extension="jpg" ContentType="image/jpeg"/>')
        content_type_defaults.append('<Default Extension="jpeg" ContentType="image/jpeg"/>')

    content_types = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        + "".join(content_type_defaults)
        + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
        + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
        + '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
        + "</Types>"
    )

    root_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>"""

    doc_rel_entries = [
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    ]
    for idx, spec in enumerate(specs, start=2):
        doc_rel_entries.append(
            f'<Relationship Id="rId{idx}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/{escape(spec.path.name)}"/>'
        )
    doc_rels = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + "".join(doc_rel_entries)
        + "</Relationships>"
    )

    styles = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="20"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:after="120"/></w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display"/>
      <w:b/><w:color w:val="16324F"/><w:sz w:val="30"/>
    </w:rPr>
  </w:style>
</w:styles>"""

    body_parts: list[str] = []
    for idx, spec in enumerate(specs):
        label = spec.path.stem.replace("-", " ").replace("_", " ").title()
        body_parts.append(page_for_image(spec, f"rId{idx + 2}", label, idx < len(specs) - 1))

    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
        'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
        'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
        'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
        'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        '<w:body>'
        + "".join(body_parts)
        + '<w:sectPr><w:pgSz w:w="15840" w:h="12240" w:orient="landscape"/>'
        '<w:pgMar w:top="540" w:right="540" w:bottom="540" w:left="540" w:header="360" w:footer="360" w:gutter="0"/></w:sectPr>'
        + "</w:body></w:document>"
    )

    core = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties
  xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:dcmitype="http://purl.org/dc/dcmitype/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>{escape(deck_title)}</dc:title>
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

    files: dict[str, bytes] = {
        "[Content_Types].xml": content_types.encode("utf-8"),
        "_rels/.rels": root_rels.encode("utf-8"),
        "word/document.xml": document.encode("utf-8"),
        "word/styles.xml": styles.encode("utf-8"),
        "word/_rels/document.xml.rels": doc_rels.encode("utf-8"),
        "docProps/core.xml": core.encode("utf-8"),
        "docProps/app.xml": app.encode("utf-8"),
    }
    for spec in specs:
        files[f"word/media/{spec.path.name}"] = spec.path.read_bytes()

    write_zip(output_path.resolve(), files)


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera un DOCX con una imagen por pagina.")
    parser.add_argument("images", nargs="+", type=Path, help="Imagenes PNG o JPG en orden de pagina.")
    parser.add_argument("--output", required=True, type=Path, help="Archivo DOCX de salida.")
    parser.add_argument("--title", default="KiskeyaVet App Screens", help="Titulo del documento.")
    args = parser.parse_args()

    build_docx(args.images, args.output, args.title)
    print(os.fspath(args.output.resolve()))


if __name__ == "__main__":
    main()
