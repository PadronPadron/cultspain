import type {Metadata} from 'next';
export const metadata:Metadata={title:'CULT SPAIN',description:'CULT SPAIN · Cut & Style · Lugo'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
