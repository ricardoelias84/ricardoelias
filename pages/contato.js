import Link from 'next/link';

function contato() {
    return <div align="center">
        <h1>Contato</h1>
        <p><h2>se precisar falar comigo é só preencher esse formulario, ou clique aqui e me manda uma mensagem no whatsapp</h2></p>
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

export default contato