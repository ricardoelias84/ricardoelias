import Link from 'next/link';

function blog() {
    return <div align="center">
        <h1>Blog no Wordpress</h1>
        <p><h2>Notícias relevantes sobre Proteção e Privacidade de dados</h2></p>
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

export default blog