import Link from 'next/link';

export function home() {
    return <div align="center">
        
        <h1>Sejam bem vindos</h1>
        <p><h2>ricardoelias.com.br em desenvolvimento</h2></p>
        <p>
            <h3>
            <Link href="/">Home</Link> |
            <Link href="/sobre">Sobre</Link> |
            <Link href="/servicos">Serviços</Link> |
            <Link href="/depoimentos">Depoimentos</Link> |
            <Link href="/contato">Contato</Link>
            </h3>
        </p>
    </div>;

}
export default home