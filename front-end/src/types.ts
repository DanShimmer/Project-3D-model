import { ButtonHTMLAttributes, DetailedHTMLProps } from 'react'

export type ButtonProps = DetailedHTMLProps<
  ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  loading?: boolean
}

export type GenerateButtonProps = Omit<ButtonProps, 'children'> & {
  type?: 'text' | 'image'
}