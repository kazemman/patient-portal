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
  const sizeConfig = {
    small: {
      logoSize: 32,
      mainTextSize: 'text-base',
      subtitleSize: 'text-xs',
      showTextOverride: false
    },
    medium: {
      logoSize: 40,
      mainTextSize: 'text-lg',
      subtitleSize: 'text-xs',
      showTextOverride: true
    },
    large: {
      logoSize: 48,
      mainTextSize: 'text-2xl',
      subtitleSize: 'text-sm',
      showTextOverride: true
    }
  }

  const config = sizeConfig[size]
  const shouldShowText = showText && config.showTextOverride

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-shrink-0">
        <Image
          src="/invotech-logo.png"
          alt="Invotech logo"
          width={config.logoSize}
          height={config.logoSize}
          className="rounded-lg object-contain"
          priority
        />
      </div>
      
      {shouldShowText && (
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