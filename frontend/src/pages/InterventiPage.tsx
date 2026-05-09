import { Box, Typography } from '@mui/material'
import Layout from '../components/ui/Layout'

export default function InterventiPage() {
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Interventi</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>In sviluppo...</Typography>
      </Box>
    </Layout>
  )
}
