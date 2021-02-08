import Link from 'next/link';

function depoimentos() {
    return <div align="center">
        <h1>Depoimentos</h1>
        <p><h2>Palavras de pessoas que ajudaram a construir minha carreira</h2></p>
            <p>
                <h3>
            <Link href="/">Home</Link> |
            <Link href="/sobre">Sobre</Link> | 
            <Link href="/servicos">Serviços</Link> |          
            <Link href="/depoimentos">Depoimentos</Link> | 
            <Link href="/contato">Contato</Link>
            </h3>
        </p>
    </div>
    
}

export default depoimentos