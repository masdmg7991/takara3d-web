from __future__ import annotations

from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
checks = 0

def require(condition: bool, message: str) -> None:
    global checks
    if not condition:
        raise AssertionError('[FAIL] ' + message)
    checks += 1

def read(relative: str) -> str:
    path = ROOT / relative
    require(path.is_file(), f'Existe {relative}')
    return path.read_text(encoding='utf-8-sig')

def main() -> int:
    workflow = read('.github/workflows/quality-gate.yml')
    pr = read('.github/PULL_REQUEST_TEMPLATE.md')
    owners = read('.github/CODEOWNERS')
    governance = read('docs/GITHUB_GOVERNANCE.md')
    contributing = read('CONTRIBUTING.md')
    gate = read('tools/takara_quality_gate.ps1')
    state = json.loads(read('config/repository-governance.json'))

    require('name: Quality Gate' in workflow, 'Workflow conserva nombre estable')
    require('branches: [main]' in workflow, 'Workflow se limita a main en push/PR')
    require('workflow_dispatch:' in workflow, 'Workflow permite ejecución manual')
    require('permissions:\n  contents: read' in workflow, 'CI usa contents read')
    require('persist-credentials: false' in workflow, 'Checkout no persiste credenciales')
    require('takara_quality_gate.ps1 -Mode prepush' in workflow, 'CI ejecuta Gate prepush')
    require('retention-days: 14' in workflow, 'Artefacto CI tiene retención limitada')
    require('if: always()' in workflow, 'Reporte se intenta publicar incluso con fallo')
    require('${{ secrets.' not in workflow, 'CI no consume GitHub secrets')

    forbidden_ci = (
        'git push', 'gh release', 'clasp push', 'clasp deploy',
        'gcloud app deploy', 'firebase deploy', 'npm publish'
    )
    for marker in forbidden_ci:
        require(marker.lower() not in workflow.lower(), f'CI no contiene {marker}')

    for marker in (
        '## Alcance', '## Contrato / autoridad afectada', '## Evidencia',
        '## Riesgo residual', '## Publicación', '## Deploy',
        'Este PR no implica por sí mismo deploy de Apps Script',
        'takara_quality_gate.ps1 -Mode prepush',
    ):
        require(marker in pr, f'PR template conserva {marker}')

    require('* @masdmg7991' in owners, 'CODEOWNERS asigna ownership del repo')
    require('único mantenedor' in owners, 'CODEOWNERS documenta límite de aprobación')

    require(state.get('schema_version') == 'TAKARA_REPO_GOVERNANCE_V1', 'Schema governance exacto')
    require(state.get('repository') == 'masdmg7991/takara3d-web', 'Repositorio governance exacto')
    require(state.get('default_branch') == 'main', 'Rama canónica main')
    require(state.get('required_workflow') == 'Quality Gate', 'Check requerido estable')
    require(state.get('activation_status') == 'prepared_not_applied', 'Gobierno remoto no se finge aplicado')

    protection = state.get('main_protection') or {}
    require(protection.get('require_pull_request') is True, 'Target exige PR')
    require(protection.get('require_status_checks') is True, 'Target exige status checks')
    require(protection.get('required_check') == 'Quality Gate', 'Target exige Quality Gate')
    require(protection.get('require_conversation_resolution') is True, 'Target exige resolver conversaciones')
    require(protection.get('allow_force_pushes') is False, 'Target bloquea force push')
    require(protection.get('allow_deletions') is False, 'Target bloquea borrado main')
    require(protection.get('require_code_owner_review') is False, 'Single maintainer no queda autobloqueado')

    ci = state.get('ci') or {}
    require(ci.get('permissions') == 'contents:read', 'Estado CI declara read-only')
    require(ci.get('persist_checkout_credentials') is False, 'Estado CI no persiste credenciales')
    require(ci.get('deploy_coupled') is False, 'CI y deploy permanecen separados')
    require(ci.get('report_artifact_retention_days') == 14, 'Estado CI retiene reportes 14 días')

    for marker in (
        'Estado: preparado localmente',
        'Quality Gate',
        'force-push deshabilitado',
        'borrado de `main` deshabilitado',
        'aprobación obligatoria de CODEOWNER desactivada',
        'publicar la rama candidata, no `main` directamente',
        'deploy de Apps Script como operación distinta',
    ):
        require(marker in governance, f'Gobierno documenta {marker}')

    require('docs/GITHUB_GOVERNANCE.md' in contributing, 'CONTRIBUTING enlaza gobierno GitHub')

    for artifact in (
        '.github/PULL_REQUEST_TEMPLATE.md',
        '.github/CODEOWNERS',
        'docs/GITHUB_GOVERNANCE.md',
        'config/repository-governance.json',
        'tools/takara_validar_github_governance.py',
    ):
        require(artifact in gate, f'Quality Gate conserva {artifact}')

    print('[TAKARA_GITHUB_GOVERNANCE_OK] ' + json.dumps({
        'checks': checks,
        'activation_status': state['activation_status'],
        'required_workflow': state['required_workflow'],
    }, ensure_ascii=False, separators=(',', ':')))
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
