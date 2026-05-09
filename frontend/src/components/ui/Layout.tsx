import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Box, Tooltip, Typography, Avatar, IconButton } from '@mui/material'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined'
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import ReceiptOutlinedIcon from '@mui/icons-material/ReceiptOutlined'
import PointOfSaleOutlinedIcon from '@mui/icons-material/PointOfSaleOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import { useAuthStore } from '../../store/auth'
import { apiLogout } from '../../api/client'

const NAV = [
  { path: '/clienti', label: 'Clienti', Icon: PeopleAltOutlinedIcon },
  { path: '/preventivi', label: 'Preventivi', Icon: DescriptionOutlinedIcon },
  { path: '/interventi', label: 'Interventi', Icon: BuildOutlinedIcon },
  { path: '/ddt', label: 'DDT', Icon: LocalShippingOutlinedIcon },
  { path: '/fatture', label: 'Fatture', Icon: ReceiptOutlinedIcon },
  { path: '/scontrini', label: 'Scontrini', Icon: PointOfSaleOutlinedIcon },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const logout = useAuthStore(s => s.logout)

  const handleLogout = async () => {
    await apiLogout()
    logout()
    navigate('/login')
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default' }}>
      {/* Navigation Rail */}
      <Box sx={{
        width: 80, flexShrink: 0, bgcolor: '#E8EAF6',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        py: 1.5, gap: 0.5,
      }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44, mb: 1, fontSize: 14, fontWeight: 700 }}>
          ES
        </Avatar>
        {NAV.map(({ path, label, Icon }) => {
          const active = pathname.startsWith(path)
          return (
            <Tooltip key={path} title={label} placement="right">
              <Box onClick={() => navigate(path)} sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 0.4, width: 72, py: 0.8, borderRadius: 4, cursor: 'pointer',
                bgcolor: active ? 'primary.light' : 'transparent',
                color: active ? '#fff' : 'text.secondary',
                transition: 'background 0.15s',
                '&:hover': { bgcolor: active ? 'primary.light' : 'rgba(43,75,160,0.1)' },
              }}>
                <Icon sx={{ fontSize: 22 }} />
                <Typography sx={{ fontSize: 10, fontWeight: active ? 600 : 400, lineHeight: 1 }}>
                  {label}
                </Typography>
              </Box>
            </Tooltip>
          )
        })}
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Impostazioni" placement="right">
          <Box onClick={() => navigate('/impostazioni')} sx={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 0.4, width: 72, py: 0.8, borderRadius: 4, cursor: 'pointer',
            color: pathname === '/impostazioni' ? 'primary.main' : 'text.secondary',
            '&:hover': { bgcolor: 'rgba(43,75,160,0.1)' },
          }}>
            <SettingsOutlinedIcon sx={{ fontSize: 22 }} />
            <Typography sx={{ fontSize: 10, lineHeight: 1 }}>Impost.</Typography>
          </Box>
        </Tooltip>
        <Tooltip title="Esci" placement="right">
          <IconButton onClick={handleLogout} size="small" sx={{ color: 'text.secondary' }}>
            <LogoutOutlinedIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Tooltip>
      </Box>
      {/* Content */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </Box>
    </Box>
  )
}
