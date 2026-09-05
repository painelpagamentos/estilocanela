const fs = require('fs');
const path = require('path');

const policiesDir = path.join(__dirname, '../views/pages/policies');

module.exports = {
  privacy: {
    title: 'Política de Privacidade',
    file: path.join(policiesDir, 'privacidade.html'),
    defaultContent: `
      <p>A Yuna Bella LTDA valoriza a privacidade dos seus clientes e está comprometida em proteger as informações pessoais coletadas durante a navegação e compra em nosso site.</p>

      <h2>1. Dados coletados</h2>
      <ul>
        <li>Dados pessoais: nome completo, CPF, telefone, e-mail e endereço de entrega.</li>
        <li>Dados de pagamento: processados de forma criptografada pelo gateway de pagamento. Não armazenamos dados de cartão de crédito.</li>
        <li>Dados de navegação: endereço IP, cookies e histórico de compras para melhorar a experiência do usuário.</li>
      </ul>

      <h2>2. Uso das informações</h2>
      <p>Utilizamos seus dados para processar pedidos, enviar atualizações sobre compras, realizar entregas, prestar atendimento ao cliente e enviar comunicações de marketing (quando autorizado).</p>

      <h2>3. Compartilhamento de dados</h2>
      <p>Seus dados podem ser compartilhados com transportadoras, gateways de pagamento e autoridades competentes quando exigido por lei.</p>

      <h2>4. Segurança</h2>
      <p>Adotamos medidas técnicas e administrativas para proteger suas informações contra acesso não autorizado, perda ou vazamento.</p>

      <h2>5. Seus direitos</h2>
      <p>Você pode solicitar acesso, correção, exclusão ou portabilidade dos seus dados a qualquer momento pelo e-mail contato@yunabella.com.</p>
    `
  },
  terms: {
    title: 'Termos de Uso',
    file: path.join(policiesDir, 'termos.html'),
    defaultContent: `
      <p>Ao acessar e utilizar o site Yuna Bella, você concorda com os seguintes termos e condições.</p>

      <h2>1. Cadastro</h2>
      <p>As informações fornecidas no momento da compra devem ser verdadeiras, completas e atualizadas. A Yuna Bella não se responsabiliza por erros de entrega causados por dados incorretos.</p>

      <h2>2. Produtos e preços</h2>
      <p>As imagens dos produtos são ilustrativas. Os preços podem ser alterados sem aviso prévio. As promoções são válidas enquanto durarem os estoques.</p>

      <h2>3. Pagamento</h2>
      <p>Aceitamos as formas de pagamento exibidas no checkout. O pedido será processado após a confirmação do pagamento pela instituição financeira.</p>

      <h2>4. Propriedade intelectual</h2>
      <p>Todo o conteúdo do site (imagens, textos, logotipos e marca) é de propriedade da Yuna Bella e protegido por lei.</p>

      <h2>5. Limitação de responsabilidade</h2>
      <p>A Yuna Bella se responsabiliza apenas por produtos adquiridos em seu site oficial. Não nos responsabilizamos por compras realizadas em sites de terceiros.</p>
    `
  },
  shipping: {
    title: 'Política de Envio',
    file: path.join(policiesDir, 'envio.html'),
    defaultContent: `
      <p>A Yuna Bella realiza entregas para todo o território nacional.</p>

      <h2>1. Prazo de postagem</h2>
      <p>Os pedidos são postados em até 3 dias úteis após a confirmação do pagamento, exceto em feriados e eventos de alta demanda.</p>

      <h2>2. Prazo de entrega</h2>
      <p>O prazo de entrega varia de acordo com o destino e a modalidade de envio selecionada. O prazo estimado é informado no momento da compra.</p>

      <h2>3. Frete grátis</h2>
      <p>Oferecemos frete grátis para pedidos acima de R$ 100,00, conforme anunciado em nosso site.</p>

      <h2>4. Rastreamento</h2>
      <p>Após a postagem, o código de rastreamento será enviado por e-mail ou WhatsApp.</p>

      <h2>5. Problemas na entrega</h2>
      <p>Se ocorrer atraso, extravio ou avaria, entre em contato pelo e-mail contato@yunabella.com para que possamos resolver a situação.</p>
    `
  },
  returns: {
    title: 'Política de Trocas e Devoluções',
    file: path.join(policiesDir, 'trocas.html'),
    defaultContent: `
      <p>Você pode solicitar troca ou devolução em até 7 dias corridos após o recebimento do produto, conforme o Código de Defesa do Consumidor.</p>

      <h2>1. Condições para troca/devolução</h2>
      <ul>
        <li>O produto deve estar sem sinais de uso.</li>
        <li>Deve conter etiquetas e embalagem originais.</li>
        <li>É necessário apresentar nota fiscal ou comprovante de compra.</li>
      </ul>

      <h2>2. Como solicitar</h2>
      <p>Envie um e-mail para contato@yunabella.com com o número do pedido, fotos do produto e motivo da solicitação.</p>

      <h2>3. Procedimentos</h2>
      <p>Após análise, enviaremos as instruções para postagem. O prazo para análise é de até 7 dias úteis após o recebimento do produto em nosso centro de distribuição.</p>

      <h2>4. Reembolso</h2>
      <p>Em caso de devolução aprovada, o reembolso será processado na mesma forma de pagamento utilizada na compra, em até 10 dias úteis.</p>

      <h2>5. Produtos não elegíveis</h2>
      <p>Produtos usados, lavados, danificados ou sem embalagem original não serão aceitos para troca ou devolução.</p>
    `
  },
  payment: {
    title: 'Política de Pagamento',
    file: path.join(policiesDir, 'pagamento.html'),
    defaultContent: `
      <p>A Yuna Bella oferece um processo de pagamento seguro através de gateway parceiro.</p>

      <h2>1. Formas de pagamento</h2>
      <p>Aceitamos cartão de crédito (Visa, Mastercard, Elo, American Express, Hipercard), boleto bancário e Pix.</p>

      <h2>2. Segurança</h2>
      <p>As transações são processadas com criptografia SSL e seguem os padrões de segurança do mercado de pagamentos.</p>

      <h2>3. Confirmação</h2>
      <p>O pedido será processado após a confirmação do pagamento. Pedidos pagos por boleto ou Pix podem levar até 2 dias úteis para compensação.</p>

      <h2>4. Cancelamento por falta de pagamento</h2>
      <p>Pedidos com pagamento não confirmado em até 3 dias corridos poderão ser cancelados automaticamente.</p>

      <h2>5. Nota fiscal</h2>
      <p>A nota fiscal eletrônica é enviada junto com o pedido, no momento da postagem.</p>
    `
  }
};

if (!fs.existsSync(policiesDir)) fs.mkdirSync(policiesDir, { recursive: true });

for (const key in module.exports) {
  const p = module.exports[key];
  if (!fs.existsSync(p.file)) {
    fs.writeFileSync(p.file, p.defaultContent.trim());
  }
}
