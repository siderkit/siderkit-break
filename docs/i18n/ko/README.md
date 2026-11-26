<div align="center">
  <img src="../../assets/hero-neutral.png" alt="Siderkit Break: 진행 중인 집중 세션과 휴식 알림 카드" width="880" />
</div>

# Siderkit Break

**잠시 숨을 고를 여유.**

Windows, macOS, Linux를 위한 조용하고 로컬 우선의 집중 타이머입니다. 집중 리듬을 유지하고, 방해하지 않으며, 일어나서 멀리 바라볼 때를 알려 줍니다.

**언어:** [English](../../../README.md) · [简体中文](../zh-CN/README.md) · [繁體中文](../zh-TW/README.md) · [हिन्दी](../hi/README.md) · [Español](../es/README.md) · [Français](../fr/README.md) · [Português](../pt/README.md) · [العربية](../ar/README.md) · [বাংলা](../bn/README.md) · [Bahasa Indonesia](../id/README.md) · [Русский](../ru/README.md) · [اردو](../ur/README.md) · [Deutsch](../de/README.md) · [日本語](../ja/README.md) · [Kiswahili](../sw/README.md) · [मराठी](../mr/README.md) · [తెలుగు](../te/README.md) · [Türkçe](../tr/README.md) · [தமிழ்](../ta/README.md) · [Tiếng Việt](../vi/README.md) · **한국어** · [فارسی](../fa/README.md) · [Filipino](../fil/README.md) · [ไทย](../th/README.md) · [Italiano](../it/README.md) · [Bahasa Melayu](../ms/README.md) · [Polski](../pl/README.md) · [Українська](../uk/README.md) · [Nederlands](../nl/README.md) · [Română](../ro/README.md)

> **상태:** 1.0 릴리스 후보. 공개 바이너리는 아직 없습니다. 소스에서 빌드하세요.

## 주요 기능

- **나에게 맞는 리듬.** 집중, 짧은 휴식, 긴 휴식 주기를 일시정지, 재개, 건너뛰기, 초기화와 함께 실행합니다.
- **방해하지 않음.** 항상 위에 표시되는 작은 카운트다운. 마우스를 올리기 전까지 클릭이 통과됩니다.
- **실행할 수 있는 알림.** 각 단계가 끝날 때 앱 내 카드가 열립니다. 미루기와 건너뛰기를 지원하고 내장 알림음이 울립니다.
- **데이터는 로컬에.** 로컬 세션 기록, 스프레드시트 내보내기, 40개 언어, 테마, 전역 단축키.

## 소스에서 빌드

Node.js 22+, pnpm 12, Rust 도구 체인, 데스크톱 프레임워크에 필요한 플랫폼 빌드 도구가 필요합니다.

```bash
pnpm install
pnpm check
pnpm tauri build
```

전체 플랫폼 목록과 번들 명령은 영어 README를 참고하세요.

## 문서

- [제품 소개](../../product-brief.md)
- [릴리스 가이드](../../release.md)
- [English README](../../../README.md)
- [모든 언어](../README.md)

## 라이선스

GPL-3.0-only. See [LICENSE](../../../LICENSE) and [NOTICE](../../../NOTICE). Releases up to 1.0.3 remain under Apache-2.0.
