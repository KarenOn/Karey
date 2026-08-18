from __future__ import annotations

import argparse
import struct
import zlib
from pathlib import Path


def png_info(path: Path) -> tuple[int, int, int, int, bytes]:
    with path.open("rb") as file:
        if file.read(8) != b"\x89PNG\r\n\x1a\n":
            raise ValueError(f"{path} no es un PNG valido.")
        width = height = bit_depth = color_type = 0
        idat_parts: list[bytes] = []
        while True:
            raw_len = file.read(4)
            if not raw_len:
                break
            length = struct.unpack(">I", raw_len)[0]
            chunk_type = file.read(4)
            data = file.read(length)
            file.read(4)  # crc
            if chunk_type == b"IHDR":
                width, height, bit_depth, color_type, compression, filter_method, interlace = struct.unpack(">IIBBBBB", data)
                if compression != 0 or filter_method != 0 or interlace != 0:
                    raise ValueError(f"{path} usa un formato PNG no soportado.")
            elif chunk_type == b"IDAT":
                idat_parts.append(data)
            elif chunk_type == b"IEND":
                break
        return width, height, bit_depth, color_type, b"".join(idat_parts)


def paeth_predictor(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def unfilter_png_rows(raw: bytes, width: int, height: int, channels: int) -> list[bytes]:
    row_len = width * channels
    rows: list[bytes] = []
    pos = 0
    prev = bytes(row_len)
    for _ in range(height):
        filter_type = raw[pos]
        pos += 1
        scan = bytearray(raw[pos:pos + row_len])
        pos += row_len
        if filter_type == 1:
            for i in range(row_len):
                left = scan[i - channels] if i >= channels else 0
                scan[i] = (scan[i] + left) & 0xFF
        elif filter_type == 2:
            for i in range(row_len):
                scan[i] = (scan[i] + prev[i]) & 0xFF
        elif filter_type == 3:
            for i in range(row_len):
                left = scan[i - channels] if i >= channels else 0
                up = prev[i]
                scan[i] = (scan[i] + ((left + up) // 2)) & 0xFF
        elif filter_type == 4:
            for i in range(row_len):
                left = scan[i - channels] if i >= channels else 0
                up = prev[i]
                up_left = prev[i - channels] if i >= channels else 0
                scan[i] = (scan[i] + paeth_predictor(left, up, up_left)) & 0xFF
        elif filter_type != 0:
            raise ValueError(f"Filtro PNG no soportado: {filter_type}")
        row = bytes(scan)
        rows.append(row)
        prev = row
    return rows


def jpeg_size(path: Path) -> tuple[int, int]:
    data = path.read_bytes()
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
        length = int.from_bytes(data[idx:idx + 2], "big")
        if marker in {0xC0, 0xC1, 0xC2, 0xC3, 0xC9, 0xCA, 0xCB}:
            if idx + 7 > len(data):
                break
            height = int.from_bytes(data[idx + 3:idx + 5], "big")
            width = int.from_bytes(data[idx + 5:idx + 7], "big")
            return width, height
        idx += length
    raise ValueError(f"No se pudo leer el tamano JPG de {path}.")


def image_info(path: Path) -> tuple[str, int, int, bytes, str, bytes | None]:
    ext = path.suffix.lower().lstrip(".")
    if ext == "png":
        width, height, bit_depth, color_type, payload = png_info(path)
        if bit_depth != 8:
            raise ValueError(f"Bit depth PNG no soportado en {path}: {bit_depth}")
        channels = {0: 1, 2: 3, 6: 4}.get(color_type)
        if channels is None:
            raise ValueError(f"Color PNG no soportado en {path}: {color_type}")
        rows = unfilter_png_rows(zlib.decompress(payload), width, height, channels)
        if channels == 4:
            rgb_rows = []
            alpha_rows = []
            for row in rows:
                rgb = bytearray()
                alpha = bytearray()
                for idx in range(0, len(row), 4):
                    rgb.extend(row[idx:idx + 3])
                    alpha.append(row[idx + 3])
                rgb_rows.append(b"\x00" + bytes(rgb))
                alpha_rows.append(b"\x00" + bytes(alpha))
            rgb_payload = zlib.compress(b"".join(rgb_rows))
            alpha_payload = zlib.compress(b"".join(alpha_rows))
            decode = f"/Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 3 /BitsPerComponent 8 /Columns {width} >>"
            return "/DeviceRGB", width, height, rgb_payload, decode, alpha_payload
        colors = 1 if channels == 1 else 3
        filtered = b"".join(b"\x00" + row for row in rows)
        decode = f"/Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors {colors} /BitsPerComponent 8 /Columns {width} >>"
        color_space = "/DeviceGray" if colors == 1 else "/DeviceRGB"
        return color_space, width, height, zlib.compress(filtered), decode, None
    if ext in {"jpg", "jpeg"}:
        width, height = jpeg_size(path)
        return "/DeviceRGB", width, height, path.read_bytes(), "/Filter /DCTDecode", None
    raise ValueError(f"Formato no soportado: {path.suffix}")


def pdf_obj(number: int, payload: bytes) -> bytes:
    return f"{number} 0 obj\n".encode("ascii") + payload + b"\nendobj\n"


def build_pdf(images: list[Path], output: Path) -> None:
    page_width = 960
    page_height = 540

    objects: list[bytes] = []
    page_objects: list[int] = []
    next_obj = 1

    catalog_obj = next_obj
    next_obj += 1
    pages_obj = next_obj
    next_obj += 1

    image_obj_numbers: list[int] = []
    content_obj_numbers: list[int] = []
    smask_obj_numbers: list[int | None] = []

    for image in images:
        image_obj_numbers.append(next_obj)
        next_obj += 1
        smask_obj_numbers.append(next_obj if image.suffix.lower() == ".png" else None)
        if image.suffix.lower() == ".png":
            next_obj += 1
        content_obj_numbers.append(next_obj)
        next_obj += 1
        page_objects.append(next_obj)
        next_obj += 1

    objects.append(pdf_obj(catalog_obj, f"<< /Type /Catalog /Pages {pages_obj} 0 R >>".encode("ascii")))

    for idx, image_path in enumerate(images):
        image_obj = image_obj_numbers[idx]
        content_obj = content_obj_numbers[idx]
        page_obj = page_objects[idx]
        color_space, width, height, image_bytes, decode_filter, smask_bytes = image_info(image_path)

        smask_ref = ""
        if smask_bytes is not None:
            smask_obj = smask_obj_numbers[idx]
            smask_dict = (
                f"<< /Type /XObject /Subtype /Image /Width {width} /Height {height} "
                f"/ColorSpace /DeviceGray /BitsPerComponent 8 "
                f"/Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 1 /BitsPerComponent 8 /Columns {width} >> "
                f"/Length {len(smask_bytes)} >>\nstream\n"
            ).encode("ascii") + smask_bytes + b"\nendstream"
            objects.append(pdf_obj(smask_obj, smask_dict))
            smask_ref = f"/SMask {smask_obj} 0 R "

        img_dict = (
            f"<< /Type /XObject /Subtype /Image /Width {width} /Height {height} "
            f"/ColorSpace {color_space} /BitsPerComponent 8 {smask_ref}{decode_filter} /Length {len(image_bytes)} >>\nstream\n"
        ).encode("ascii") + image_bytes + b"\nendstream"
        objects.append(pdf_obj(image_obj, img_dict))

        content_stream = f"q\n{page_width} 0 0 {page_height} 0 0 cm\n/Im{idx + 1} Do\nQ\n".encode("ascii")
        content_dict = f"<< /Length {len(content_stream)} >>\nstream\n".encode("ascii") + content_stream + b"endstream"
        objects.append(pdf_obj(content_obj, content_dict))

        page_dict = (
            f"<< /Type /Page /Parent {pages_obj} 0 R /MediaBox [0 0 {page_width} {page_height}] "
            f"/Resources << /XObject << /Im{idx + 1} {image_obj} 0 R >> >> "
            f"/Contents {content_obj} 0 R >>"
        ).encode("ascii")
        objects.append(pdf_obj(page_obj, page_dict))

    kids = " ".join(f"{page_obj} 0 R" for page_obj in page_objects)
    objects.insert(1, pdf_obj(pages_obj, f"<< /Type /Pages /Count {len(page_objects)} /Kids [{kids}] >>".encode("ascii")))

    pdf = bytearray(b"%PDF-1.4\n%\xff\xff\xff\xff\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf.extend(obj)

    xref_pos = len(pdf)
    pdf.extend(f"xref\n0 {len(offsets)}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))
    pdf.extend(
        f"trailer\n<< /Size {len(offsets)} /Root {catalog_obj} 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("ascii")
    )

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(pdf)


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera un PDF multipagina desde PNGs o JPGs.")
    parser.add_argument("images", nargs="+", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    build_pdf(args.images, args.output)
    print(args.output.resolve())


if __name__ == "__main__":
    main()
