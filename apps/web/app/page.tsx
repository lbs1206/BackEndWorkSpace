import Link from "next/link";
import { Button, Card, CardContent, Container, Divider, Grid, Stack, Typography } from "@mui/material";

const menus = [
  { href: "/erd-editor", title: "ERD Editor" },
  { href: "/api-docs", title: "API DOCS Editor" },
  { href: "/api-docs/view", title: "API DOCS Viewer" },
];

const sections = [
  {
    title: "ERD Editor",
    summary: "데이터 모델 설계/검토를 한 화면에서 진행합니다.",
    items: ["테이블/컬럼 시각 편집", "PK/FK/인덱스 중심 검토", "정책 기반 체크 포인트 점검"],
    flow: "모델 작성 -> 관계 검토 -> 정책 점검",
  },
  {
    title: "API DOCS Editor",
    summary: "페이지 단위 문서와 API Interface 상세 스펙을 관리합니다.",
    items: [
      "Group > Page > API Interface 구조 편집",
      "Method/URL/Auth/Header/Param/Body/Response 편집",
      "인터페이스 독립 폼 + 접기/열기 + 우측 뷰어 확인",
    ],
    flow: "페이지 선택 -> Interface 수정 -> 우측 뷰어 검토",
  },
  {
    title: "API DOCS Viewer",
    summary: "읽기 전용 화면으로 API 문서를 탐색하고 공유합니다.",
    items: ["문서 탐색 전용 인터페이스", "페이지/인터페이스 선택 조회", "요청/응답 스펙 빠른 확인"],
    flow: "페이지 탐색 -> Interface 선택 -> 상세 확인",
  },
];

export default function HomePage() {
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 4, p: 2 }}>
        <CardContent>
          <Typography variant="h3" fontWeight={700}>
            BackEndWorkSpace
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            문서 기준: <code>docs/policy/ERD_POLICY.md</code>, <code>docs/policy/API_DOC_POLICY.md</code>
          </Typography>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            {menus.map((menu) => (
              <Grid key={menu.href} size={{ xs: 12, md: 4 }}>
                <Link href={menu.href} style={{ textDecoration: "none" }}>
                  <Button
                    component="span"
                    variant="outlined"
                    fullWidth
                    sx={{ py: 2, justifyContent: "flex-start", textTransform: "none", borderRadius: 3, fontWeight: 700 }}
                  >
                    {menu.title}
                  </Button>
                </Link>
              </Grid>
            ))}
          </Grid>

          <Card variant="outlined" sx={{ mt: 3, borderRadius: 3 }}>
            <CardContent>
              <article style={{ display: "grid", gap: 20 }}>
                <section>
                  <Typography variant="h5" fontWeight={700}>
                    Workspace Docs
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    노션 문서처럼 기능별 목적/핵심 기능/활용 흐름을 빠르게 확인할 수 있게 정리했습니다.
                  </Typography>
                </section>

                {sections.map((section, index) => (
                  <section key={section.title} style={{ display: "grid", gap: 10 }}>
                    <Typography variant="h6" fontWeight={700}>
                      {index + 1}. {section.title}
                    </Typography>
                    <Typography color="text.secondary">{section.summary}</Typography>
                    <Stack spacing={0.5}>
                      {section.items.map((item) => (
                        <Typography key={item} color="text.secondary">
                          - {item}
                        </Typography>
                      ))}
                    </Stack>
                    <Typography color="text.secondary">
                      Flow: <strong>{section.flow}</strong>
                    </Typography>
                    {index < sections.length - 1 && <Divider sx={{ mt: 1 }} />}
                  </section>
                ))}
              </article>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </Container>
  );
}
