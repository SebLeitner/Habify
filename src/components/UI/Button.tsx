import { ButtonHTMLAttributes } from 'react';

const variants = {
  primary:
    'bg-brand-primary text-white shadow-md shadow-brand-primary/20 hover:bg-brand-primary/90 active:scale-[0.99]',
  secondary:
    'bg-white text-brand-primary border border-brand-primary/30 hover:bg-brand-primary/10 shadow-sm active:scale-[0.99]',
  ghost: 'bg-transparent text-brand-primary hover:bg-brand-primary/10',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

const Button = ({ variant = 'primary', className = '', ...props }: ButtonProps) => {
  const classes = [
    'rounded-full px-5 py-2 text-sm font-semibold transition-all',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-primary/20',
    'disabled:cursor-not-allowed disabled:opacity-60',
    variants[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <button className={classes} {...props} />;
};

export default Button;
