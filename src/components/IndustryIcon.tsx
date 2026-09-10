import React from 'react';
import {
  Factory,
  Package,
  ShoppingBag,
  Laptop,
  Briefcase,
  UtensilsCrossed,
  Truck,
  HeartPulse,
  HardHat,
  Wrench,
  LucideProps,
} from 'lucide-react';

interface IndustryIconProps extends LucideProps {
  icon?: string;
  industryId?: string;
}

export const IndustryIcon: React.FC<IndustryIconProps> = ({
  icon,
  industryId,
  className = 'w-4 h-4',
  ...props
}) => {
  const normalized = (icon || industryId || '').toLowerCase().trim();

  switch (normalized) {
    case 'manufacturing':
    case 'factory':
      return <Factory className={className} {...props} />;

    case 'wholesale':
    case 'package':
    case 'boxes':
      return <Package className={className} {...props} />;

    case 'retail':
    case 'shoppingbag':
    case 'shopping-bag':
    case 'store':
      return <ShoppingBag className={className} {...props} />;

    case 'saas':
    case 'laptop':
    case 'software':
    case 'code':
      return <Laptop className={className} {...props} />;

    case 'consulting':
    case 'briefcase':
    case 'services':
      return <Briefcase className={className} {...props} />;

    case 'restaurant':
    case 'utensilscrossed':
    case 'utensils-crossed':
    case 'utensils':
    case 'food':
      return <UtensilsCrossed className={className} {...props} />;

    case 'logistics':
    case 'truck':
    case 'transport':
      return <Truck className={className} {...props} />;

    case 'healthcare':
    case 'heartpulse':
    case 'heart-pulse':
    case 'health':
      return <HeartPulse className={className} {...props} />;

    case 'construction':
    case 'hardhat':
    case 'hard-hat':
    case 'builder':
      return <HardHat className={className} {...props} />;

    case 'other':
    case 'wrench':
    default:
      return <Wrench className={className} {...props} />;
  }
};

export default IndustryIcon;
