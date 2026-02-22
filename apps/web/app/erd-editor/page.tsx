import { Stack, Typography } from "@mui/material";
import { ErdEditorClient } from "../components/erd-editor-client";

export default function ErdEditorPage() {
  return (
    <main style={{ padding: 16 }}>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>ERD Editor</Typography>
      </Stack>
      <ErdEditorClient />
    </main>
  );
}
