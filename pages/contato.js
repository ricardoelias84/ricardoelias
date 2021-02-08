import Link from 'next/link';

function contato() {
    return <div align="center">
        <h1>Contato</h1>
        <p><h2>Se precisar falar comigo é só preencher esse formulario, ou clique aqui e me manda uma mensagem no <Link href="https://api.whatsapp.com/send?phone=5515981790411&text=Mensagem%20atrav%C3%A9s%20do%20site">whatsapp</Link>
            
            </h2></p>
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

export default contato