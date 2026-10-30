import zipfile, sys, struct
src, dst = sys.argv[1], sys.argv[2]
zin = zipfile.ZipFile(src)
with open(dst, 'wb') as f:
    zout = zipfile.ZipFile(f, 'w')
    for info in zin.infolist():
        data = zin.read(info.filename)
        ni = zipfile.ZipInfo(info.filename, date_time=info.date_time)
        ni.compress_type = info.compress_type; ni.external_attr = info.external_attr; ni.create_system = info.create_system
        if ni.compress_type == zipfile.ZIP_STORED:
            align = 4096 if info.filename.endswith('.so') else 4
            off = f.tell() + 30 + len(ni.filename.encode())
            pad = (-(off + 4)) % align   # 4 bytes for our own extra header
            ni.extra = struct.pack('<HH', 0xD935, pad) + b'\0' * pad
        zout.writestr(ni, data)
    zout.close()
z = zipfile.ZipFile(dst)
for i in z.infolist():
    if i.compress_type == 0:
        with open(dst,'rb') as f:
            f.seek(i.header_offset); h = f.read(30); n, e = struct.unpack('<HH', h[26:30]); d = i.header_offset + 30 + n + e
        print(i.filename, 'stored at', d, 'ok' if d % 4 == 0 else 'MISALIGNED')
