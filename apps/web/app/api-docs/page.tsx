import { Stack, Typography } from "@mui/material";
import { ApiDocEditorClient } from "../components/api-doc-editor-client";

export default function ApiDocsPage() {
  return (
    <main style={{ padding: 16 }}>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>API DOCS EDITOR</Typography>
      </Stack>
      <ApiDocEditorClient />
    </main>
  );
}
