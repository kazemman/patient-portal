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
  className = ''
}: InvotechLogoProps) => {
  const sizeConfig = {
    small: { logoSize: 32, textSize: 'text-sm' },
    medium: { logoSize: 40, textSize: 'text-base' },
    large: { logoSize: 48, textSize: 'text-lg' }
  }
  
  const config = sizeConfig[size]
  
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Logo Image */}
      <div className="flex-shrink-0">
        <img
          src="https://v3.fal.media/files/koala/P6fIDjl9cl_5-Qk54JoBM_output.png"
          alt="Invotech Logo"
          width={config.logoSize}
          height={config.logoSize}
          className="rounded-lg object-contain"
        />
      </div>
      
      {/* Text */}
      {showText && size !== 'small' && (
        <div className="min-w-0">
          <h2 className={`font-heading font-bold text-sidebar-primary leading-tight ${config.textSize}`}>
            Invotech
          </h2>
          <p className="text-xs text-sidebar-foreground/70 leading-tight">
            Peak Innovation
          </p>
        </div>
      )}
    </div>
  )
}