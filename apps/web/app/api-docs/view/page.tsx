import { Stack, Typography } from "@mui/material";
import { ApiDocViewerClient } from "../../components/api-doc-viewer-client";

export default function ApiDocsViewerPage() {
  return (
    <main style={{ padding: 16 }}>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>API DOCS VIEW (READ-ONLY)</Typography>
      </Stack>
      <ApiDocViewerClient />
    </main>
  );
}
