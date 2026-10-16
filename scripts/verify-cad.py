"""Developer audit; requires ezdxf. Generate the fixtures first with npm test.
Usage: python scripts/verify-cad.py [/path/to/unpacked/print/package]
No Python or CAD installation is required by Etykietson users.
"""
from pathlib import Path
import sys
import ezdxf

folder = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/etykietson-test-artifacts')
files = sorted(folder.glob('*.dxf'))
assert files, f'No DXF in {folder}. Run npm test first.'
for file in files:
    doc = ezdxf.readfile(file)
    audit = doc.audit()
    assert not audit.errors and not audit.fixes, (file, audit.errors, audit.fixes)
    assert doc.dxfversion == 'AC1021' and doc.units == 4, file
    assert not list(doc.paperspace()), file
    model = doc.modelspace()
    assert not model.query('TEXT MTEXT'), file
    for hatch in model.query('HATCH'):
        assert hatch.dxf.solid_fill == 1 and hatch.dxf.hatch_style == 0, file
        assert hatch.dxf.extrusion.isclose((0, 0, 1)), file
        assert all(path.is_closed for path in hatch.paths), file
    borders = []
    for line in model.query('LWPOLYLINE'):
        if abs(line.dxf.const_width - .2) < 1e-8:
            points = tuple((round(v[0], 6), round(v[1], 6)) for v in line.get_points())
            borders.append(tuple(sorted(points)))
    assert len(borders) == len(set(borders)), f'Duplicate borders: {file}'
    images = list(model.query('IMAGE'))
    if images:
        assert doc.rootdict['ACAD_IMAGE_VARS'].dxf.frame == 0, file
    for image in images:
        definition = image.image_def
        relative = Path(definition.dxf.filename)
        assert not relative.is_absolute() and '..' not in relative.parts, file
        assert (file.parent / relative).is_file(), (file, relative)
        assert int(image.dxf.flags) & 8, 'Image transparency disabled'
        assert image.image_def_reactor is not None, file
        assert image.image_def_reactor.dxf.image_handle == image.dxf.handle, file
    print(f'{file.name}: AC1021; mm; model space; {len(model)} entities; '
          f'{len(images)} PNG; audit: 0 errors, 0 fixes')
