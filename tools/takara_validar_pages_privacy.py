"""Guard the boundary between the private repository and the public Pages site."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = {
    "assets", "qr", "tienda", "index.html", "productos.html", "pedido.html",
    "contacto.html", "404.html", "favicon.ico", "robots.txt", "sitemap.xml", "CNAME",
}
PRIVATE = {"apps-script", "config", "docs", "tools", "README.md", "CONTRIBUTING.md"}


def main():
    assert not (ROOT / ".nojekyll").exists(), "Pages exclusions require Jekyll"
    lines = [line.strip() for line in (ROOT / "_config.yml").read_text(encoding="utf-8").splitlines()
             if line.strip() and not line.lstrip().startswith("#")]
    assert lines[0] == "exclude:" and all(line.startswith("- ") for line in lines[1:]), (
        "Review the publication guard before changing the Jekyll configuration format"
    )
    excluded = {line[2:].rstrip("/") for line in lines[1:]}
    assert PRIVATE <= excluded, "Internal repository files would be published"
    assert not (PUBLIC & excluded), "Public website files must remain available"
    files = subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard"], cwd=ROOT, text=True
    ).splitlines()
    roots = {Path(name).parts[0] for name in files}
    for name in roots:
        # Jekyll already excludes dotfiles and underscore-prefixed control files.
        if not name.startswith((".", "_")):
            assert name in PUBLIC or name in excluded, f"Review publication of new root entry: {name}"
    assert PUBLIC <= roots
    print("TAKARA_PAGES_PRIVACY_OK: frontend retained; backend, docs, tools and internal config excluded")


if __name__ == "__main__":
    main()
