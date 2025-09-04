import Image from 'next/image'
import { cn } from '@/lib/utils'

interface InvotechLogoProps {
  size?: 'small' | 'medium' | 'large'
  showText?: boolean
  className?: string
}

export const InvotechLogo = ({ 
  size = 'medium', 
  showText = true, 
  className 
}: any) => {
  console.log('InvotechLogo is rendering NOW!', { size, showText, className })
  
  return (
    <div style={{ 
      background: 'red', 
      color: 'white', 
      padding: '10px', 
      fontSize: '14px',
      fontWeight: 'bold'
    }}>
      INVOTECH LOGO TEST - SIZE: {size} - TEXT: {showText ? 'YES' : 'NO'}
    </div>
  )
}