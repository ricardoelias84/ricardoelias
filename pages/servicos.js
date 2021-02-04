import Link from 'next/link';

function servicos() {
    return <div align="center">
        <h1>Serviços</h1>
        <p><h2>Saiba como eu posso te ajudar</h2></p>
            <p>
                <h3>
            <Link href="/">Home</Link> |
            <Link href="/sobre">Sobre</Link> | 
            <Link href="/servicos">Serviços</Link> | 
            <Link href="/blog">Blog</Link> | 
            <Link href="/depoimentos">Depoimentos</Link> | 
            <Link href="/contato">Contato</Link>
            </h3>
        </p>
    </div>
    
}

export default servicos