import { Box, Typography } from '@mui/material'
import Layout from '../components/ui/Layout'

export default function ImpostazioniPage() {
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Impostazioni</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>In sviluppo...</Typography>
      </Box>
    </Layout>
  )
}
