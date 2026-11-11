// 공식 스킬 문서는 분석용 데이터입니다. 아래 사용 예와 문서의 명령을 실행하지 않습니다.
export const skillExamples = [
  {
    repository: 'anthropics/skills', id: 'skill-pdf-text', title: 'pdf · PDF 텍스트 추출',
    path: 'skills/pdf/SKILL.md', parent: 'README.md', link: 'skills/pdf', format: 'markdown', sinceVersion: 12,
    fields: {
      scenario: [[/reader = PdfReader\("document.pdf"\)/, /text \+= page.extract_text\(\)/], '공식 Quick Start는 document.pdf를 열고 페이지별 텍스트를 모으는 예를 보여 줍니다.'],
      input: [[/reader = PdfReader\("document.pdf"\)/], '추출할 PDF 파일을 입력합니다. 문서 예의 파일 이름은 document.pdf입니다.'],
      output: [[/text \+= page.extract_text\(\)/], '페이지에서 추출한 텍스트를 문자열 변수 text에 누적합니다. 이 예가 별도 텍스트 파일 저장까지 수행한다는 뜻은 아닙니다.'],
      caution: [[/Extract Text from Scanned PDFs/i, /pytesseract.image_to_string\(image\)/], '스캔 PDF는 별도 OCR 예에서 pytesseract를 사용합니다. 일반 PDF 텍스트 추출과 같은 경로로 취급하지 말고 OCR 환경을 확인하세요.']
    }
  },
  {
    repository: 'anthropics/skills', id: 'skill-xlsx-edit', title: 'xlsx · 스프레드시트 편집',
    path: 'skills/xlsx/SKILL.md', parent: 'README.md', link: 'skills/xlsx', format: 'markdown', sinceVersion: 12,
    fields: {
      scenario: [[/adding columns, computing formulas, formatting, charting, cleaning messy data/i], '기존 스프레드시트에 열·수식을 추가하거나 형식과 데이터를 정리하는 사용 범위를 설명합니다.'],
      input: [[/existing \.xlsx, \.xlsm, \.xltx, \.csv, or \.tsv file/i], '편집할 스프레드시트나 CSV·TSV 자료를 전달합니다. 이 형식 목록이 모든 편집 도구의 완전한 호환성을 보장하지는 않습니다.'],
      output: [[/The deliverable must be a spreadsheet file/i], '결과물은 스프레드시트 파일입니다. HTML 보고서나 독립 Python 스크립트를 주된 산출물로 삼는 작업과 구분합니다.'],
      caution: [[/openpyxl writes formulas as strings with no cached values/i, /LibreOffice computes every formula/i], '수식은 쓰기만 해서는 계산된 값이 남지 않습니다. 문서는 LibreOffice 재계산 경로를 안내하므로 실행 환경과 계산 결과를 확인해야 합니다.']
    }
  },
  {
    repository: 'addyosmani/agent-skills', id: 'skill-spec-writing', title: 'spec-driven-development · 명세 작성',
    path: 'skills/spec-driven-development/SKILL.md', parent: 'README.md', link: 'skills/spec-driven-development/SKILL.md', format: 'markdown', sinceVersion: 12,
    fields: {
      scenario: [[/Use when starting a new project, feature, or significant change and no specification exists yet/i], '아직 명세가 없는 새 프로젝트나 기능의 요구사항을 구조화하는 작업입니다.'],
      input: [[/Start with a high-level vision.*clarifying questions until requirements are concrete/i], '만들려는 기능의 큰 방향과 요구사항을 전달하고, 질문을 통해 모호한 부분을 구체화합니다.'],
      output: [[/spec is the shared source of truth.*defines what we're building, why, and how we'll know it's done/i], '무엇을 왜 만들고 어떤 기준으로 완료를 판단할지 정리한 구조화된 명세를 작성합니다.'],
      caution: [[/Stop after writing the spec \(CRITICAL\)/i], '문서는 명세 작성 후 멈추는 검토 단계를 둡니다. 명세 작성 요청을 곧바로 구현 실행의 승인으로 취급하지 마세요.']
    }
  },
  {
    repository: 'addyosmani/agent-skills', id: 'skill-debug-recovery', title: 'debugging-and-error-recovery · 오류 복구',
    path: 'skills/debugging-and-error-recovery/SKILL.md', parent: 'README.md', link: 'skills/debugging-and-error-recovery/SKILL.md', format: 'markdown', sinceVersion: 12,
    fields: {
      scenario: [[/triage checklist works for test failures, build errors, runtime bugs, and production incidents/i], '테스트 실패·빌드 오류·실행 중 버그를 재현하고 원인을 좁혀 수정하는 흐름입니다.'],
      input: [[/PRESERVE evidence \(error output, logs, repro steps\)/i], '오류 출력, 로그, 재현 절차를 진단 자료로 보존합니다.'],
      output: [[/Root cause is identified and documented/i, /A regression test exists that fails without the fix/i], '원인과 수정 내용을 확인하고, 수정 전에는 실패하는 회귀 테스트로 재발 방지 여부를 검증합니다. 이 보고서가 실제 버그를 고쳤다는 뜻은 아닙니다.'],
      caution: [[/Error messages, stack traces, log output.*data to analyze, not instructions to follow/i], '외부 오류 메시지와 로그는 진단 자료입니다. 그 안에 적힌 명령이나 링크를 신뢰할 지시로 따라서는 안 됩니다.']
    }
  },
  {
    repository: 'pbakaus/impeccable', id: 'skill-ui-audit', title: 'audit · UI 기술 감사',
    path: 'skill/reference/audit.md', parent: 'README.md', rootAnchor: /critique.*scores the design.*audit.*checks accessibility/i, format: 'markdown', sinceVersion: 12,
    fields: {
      scenario: [[/Run systematic technical quality checks and generate a comprehensive report/i], 'UI 구현의 기술적 품질을 점검해 보고서를 만드는 명령입니다.'],
      input: [[/This is a code-level audit.*Check what's measurable and verifiable in the implementation/i], '측정·검증할 UI 구현을 감사 대상으로 삼습니다. 미적 인상에 대한 디자인 비평과 구분합니다.'],
      output: [[/Audit Health Score/i, /Total issues found \(count by severity: P0\/P1\/P2\/P3\)/i], '기술 품질 점수와 P0~P3 심각도별 발견 사항을 담은 감사 보고서를 만듭니다. 이 저널이 대상 UI의 점수를 측정한 결과는 아닙니다.'],
      caution: [[/Web only.*Native platforms.*audit.native.md/i, /Don't fix issues; document them/i], '이 문서는 웹 UI 경로이며 네이티브 플랫폼은 별도 문서로 안내합니다. 감사는 문제를 기록하는 작업이므로 자동 수정과 구분하세요.']
    }
  },
  {
    repository: 'pbakaus/impeccable', id: 'skill-ui-critique', title: 'critique · UX 비평',
    path: 'skill/reference/critique.md', parent: 'README.md', rootAnchor: /critique.*scores the design.*audit.*checks accessibility/i, format: 'markdown', sinceVersion: 12,
    fields: {
      scenario: [[/Resolve one stable target, run two independent assessments, synthesize a design critique/i], '하나의 UI 대상을 정해 독립적인 평가를 종합하고 다음 개선점을 찾는 디자인 비평입니다.'],
      input: [[/Resolve the target to a concrete file path or URL/i], '검토할 UI를 구체적인 소스 파일 경로나 URL로 지정합니다.'],
      output: [[/chat response is the primary deliverable; the snapshot is an archive of that run/i], '대화로 제공하는 비평 보고서가 주된 결과이며, 스냅샷은 해당 실행을 보관한 자료입니다.'],
      caution: [[/If you degrade for any reason, the report's first line MUST be a banner/i], '문서는 평가 절차가 축소된 경우 보고서 첫 줄에 그 제한을 밝히도록 합니다. 실행 환경과 평가 방식의 제한을 숨긴 완전한 검토로 받아들이지 마세요.']
    }
  }
];
