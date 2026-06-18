from pathlib import Path
import json
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
PACKAGE = json.loads((ROOT / "package.json").read_text())
RELEASE = ROOT / "release"
RELEASE.mkdir(exist_ok=True)
ZIP_PATH = RELEASE / f"amazing-translate-{PACKAGE['version']}.zip"

if not DIST.exists():
    raise SystemExit("dist/ does not exist. Run npm run build first.")

with zipfile.ZipFile(ZIP_PATH, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(DIST.rglob("*")):
        if path.is_file():
            archive.write(path, path.relative_to(DIST))

print(ZIP_PATH)
