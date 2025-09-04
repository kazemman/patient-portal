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
}: InvotechLogoProps) => {
  console.log('InvotechLogo rendering with:', { size, showText, className })
  
  const sizeConfig = {
    small: {
      logoSize: 32,
      mainTextSize: 'text-sm',
      subtitleSize: 'text-xs'
    },
    medium: {
      logoSize: 40,
      mainTextSize: 'text-lg',
      subtitleSize: 'text-sm'
    },
    large: {
      logoSize: 48,
      mainTextSize: 'text-2xl',
      subtitleSize: 'text-base'
    }
  }

  const config = sizeConfig[size]

  return (
    <div className={cn('flex items-center gap-3 bg-red-100 p-2', className)}>
      {/* Debug text */}
      <div className="text-xs text-red-600">LOGO HERE</div>
      
      {/* Logo Image - try both Next.js Image and regular img */}
      <div className="flex-shrink-0 bg-blue-100 p-1">
        <img
          src="/invotech-logo.png"
          alt="Invotech Logo"
          width={config.logoSize}
          height={config.logoSize}
          className="rounded-lg object-contain"
        />
      </div>
      
      {/* Text - Show for medium/large or when explicitly requested */}
      {(showText && size !== 'small') && (
        <div className="flex flex-col min-w-0">
          <h1 className={cn(
            'font-heading font-semibold text-foreground leading-tight truncate',
            config.mainTextSize
          )}>
            Invotech
          </h1>
          <p className={cn(
            'font-sans font-medium text-muted-foreground leading-tight truncate',
            config.subtitleSize
          )}>
            Peak Innovation
          </p>
        </div>
      )}
    </div>
  )
}