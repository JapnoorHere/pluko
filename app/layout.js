import './globals.css';
import {Geist, Geist_Mono} from 'next/font/google';
import {TooltipProvider} from '@/components/ui/tooltip';
import {Toaster} from '@/components/ui/sonner';

const geist=Geist({subsets:['latin'],variable:'--font-geist-sans'});
const geistMono=Geist_Mono({subsets:['latin'],variable:'--font-geist-mono'});

export const metadata={title:'Pluko — find the right image',description:'Independent image search infrastructure',icons:{icon:'/logo.svg'}};

export default function RootLayout({children}){return <html lang="en" className={`dark ${geist.variable} ${geistMono.variable}`}><body className="font-sans antialiased"><TooltipProvider>{children}</TooltipProvider><Toaster theme="dark" richColors position="bottom-right"/></body></html>;}
