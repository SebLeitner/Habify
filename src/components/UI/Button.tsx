import { ButtonHTMLAttributes } from 'react';

const variants = {
  primary: 'bg-brand-primary hover:bg-brand-primary/80 text-white',
  secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-100',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-200',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

const Button = ({ variant = 'primary', className = '', ...props }: ButtonProps) => {
  const classes = [
    'rounded-lg px-4 py-2 text-sm font-semibold transition',
    'focus:outline-none focus:ring-2 focus:ring-brand-secondary/80 focus:ring-offset-2 focus:ring-offset-slate-900',
    variants[variant],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <button className={classes} {...props} />;
};

export default Button;
