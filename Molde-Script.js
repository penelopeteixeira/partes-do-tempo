(() => {
  const MINUTO_MS = 60 * 1000;
  const BLOCO_MS = 5 * MINUTO_MS;
  const DIAS_UTEIS = 5;
  const TURNOS = [
    { inicio: 9 * 60, fim: 12 * 60 },
    { inicio: 13 * 60, fim: 18 * 60 },
  ];
  const MINUTOS_UTEIS_POR_DIA = TURNOS.reduce((total, turno) => total + turno.fim - turno.inicio, 0);
  const FERIADOS_POR_PAGINA = 3;
  const MAXIMO_PERIODOS_DE_MERCURIO = 3;

  const relogio = document.getElementById('agora');
  const tempoRestante = document.getElementById('tempo-restante');
  const listaKpis = document.getElementById('kpi-lista');
  const listaFeriados = document.getElementById('feriados-lista');
  const anoFeriados = document.getElementById('ano-feriados');
  const avisoFeriados = document.getElementById('feriados-vazio');
  const statusFeriados = document.getElementById('feriados-status');
  const paginacaoFeriados = document.getElementById('feriados-paginacao');
  const paginaAnterior = document.getElementById('feriados-anterior');
  const proximaPagina = document.getElementById('feriados-proxima');
  const listaMercurio = document.getElementById('mercurio-lista');
  const avisoMercurio = document.getElementById('mercurio-vazio');

  const formatoNumero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
  const formatoMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' });
  const formatoData = new Intl.DateTimeFormat('pt-BR');
  const formatoDiaDaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });

  // As datas são locais e o limite final de cada período é a próxima meia-noite.
  function meiaNoiteDoDia(agora, deslocamento = 0) {
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + deslocamento);
  }

  function diasDesdeSegunda(agora) {
    return (agora.getDay() + 6) % 7;
  }

  // Retorna os dois lados da fórmula além do percentual, para que o molde mostre a conta.
  function medirProgresso(decorrido, duracao) {
    const tempoContado = Math.max(0, Math.min(decorrido, duracao));
    const completos = Math.floor(tempoContado / BLOCO_MS);
    const total = duracao / BLOCO_MS;
    const percentual = tempoContado === duracao ? 100 : (completos / total) * 100;
    return {
      completos,
      total,
      percentual,
      minutosDecorridos: Math.floor(tempoContado / MINUTO_MS),
      minutosDoPeriodo: Math.floor(duracao / MINUTO_MS),
    };
  }

  function calcularProgressoDoDia(agora) {
    const inicio = meiaNoiteDoDia(agora);
    const fim = meiaNoiteDoDia(agora, 1);
    return medirProgresso(agora - inicio, fim - inicio);
  }

  function calcularProgressoDaSemanaInteira(agora) {
    const dias = diasDesdeSegunda(agora);
    const inicio = meiaNoiteDoDia(agora, -dias);
    const fim = meiaNoiteDoDia(agora, 7 - dias);
    return medirProgresso(agora - inicio, fim - inicio);
  }

  // Soma as jornadas já encerradas e a parte decorrida dos dois turnos de hoje.
  function calcularProgressoDaSemanaUtil(agora) {
    const diasConcluidos = Math.min(diasDesdeSegunda(agora), DIAS_UTEIS);
    let minutos = diasConcluidos * MINUTOS_UTEIS_POR_DIA;
    if (diasConcluidos < DIAS_UTEIS) {
      const minutoDoDia = agora.getHours() * 60 + agora.getMinutes();
      for (const { inicio, fim } of TURNOS) {
        minutos += Math.max(0, Math.min(minutoDoDia, fim) - inicio);
      }
    }

    const duracao = DIAS_UTEIS * MINUTOS_UTEIS_POR_DIA * MINUTO_MS;
    const medicao = medirProgresso(minutos * MINUTO_MS, duracao);
    // A mesma ordem da conta no painel evita diferenças ao arredondar valores como 57,5%.
    return { ...medicao, percentual: (100 * medicao.completos) / medicao.total };
  }

  function calcularProgressoDoMes(agora) {
    const ano = agora.getFullYear();
    const mes = agora.getMonth();
    const inicio = new Date(ano, mes, 1);
    const fim = new Date(ano, mes + 1, 1);
    return medirProgresso(agora - inicio, fim - inicio);
  }

  function calcularProgressoDoAno(agora) {
    const ano = agora.getFullYear();
    const inicio = new Date(ano, 0, 1);
    const fim = new Date(ano + 1, 0, 1);
    return medirProgresso(agora - inicio, fim - inicio);
  }

  // Cada trimestre tem três meses de calendário e mede o próprio intervalo.
  function calcularProgressoDoTrimestre(agora, trimestre) {
    const ano = agora.getFullYear();
    const mesInicial = (trimestre - 1) * 3;
    const inicio = new Date(ano, mesInicial, 1);
    const fim = new Date(ano, mesInicial + 3, 1);
    return medirProgresso(agora - inicio, fim - inicio);
  }

  // Arredonda para cima, mantendo um minuto restante até a virada do dia.
  function calcularMinutosAteMeiaNoite(agora) {
    return Math.ceil((meiaNoiteDoDia(agora, 1) - agora) / MINUTO_MS);
  }

  function formatarDuracao(minutos) {
    const horas = Math.floor(minutos / 60);
    const resto = String(minutos % 60).padStart(2, '0');
    return `${horas}h ${resto}min`;
  }

  function capitalizar(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function elemento(tag, texto = '') {
    const no = document.createElement(tag);
    no.textContent = texto;
    return no;
  }

  function atualizarTexto(no, texto) {
    if (no.textContent !== texto) no.textContent = texto;
  }

  // Cada linha é criada uma vez. O relógio atualiza os valores dentro dela.
  function montarLinhasDosIndicadores() {
    const indicadores = [
      { id: 'dia', nome: 'Dia', calcular: calcularProgressoDoDia },
      { id: 'semana-util', nome: 'Semana útil', calcular: calcularProgressoDaSemanaUtil },
      { id: 'semana', nome: 'Semana inteira', calcular: calcularProgressoDaSemanaInteira },
      { id: 'mes', nome: 'Mês', calcular: calcularProgressoDoMes },
      { id: 'ano', nome: 'Ano', calcular: calcularProgressoDoAno },
      ...[1, 2, 3, 4].map(trimestre => ({
        id: `q${trimestre}`,
        nome: `Q${trimestre}`,
        calcular: agora => calcularProgressoDoTrimestre(agora, trimestre),
        trimestre,
      })),
    ];

    return indicadores.map(indicador => {
      const linha = elemento('li');
      linha.id = `kpi-${indicador.id}`;
      const nome = elemento('strong', indicador.nome);
      const numero = elemento('span');
      const detalhe = elemento('div');
      const formula = elemento('div');
      numero.className = 'kpi-pct';
      detalhe.className = 'kpi-detalhe';
      formula.className = 'kpi-formula';
      linha.append(nome, numero, detalhe, formula);
      listaKpis.append(linha);
      return { ...indicador, linha, titulo: nome, numero, detalhe, formula };
    });
  }

  function atualizarIndicadores(agora) {
    const trimestreAtual = Math.floor(agora.getMonth() / 3) + 1;
    for (const indicador of linhasDosIndicadores) {
      const { completos, total, percentual, minutosDecorridos, minutosDoPeriodo } = indicador.calcular(agora);
      const rotulo = percentual === 100 ? 100 : Math.min(99, Math.round(percentual));
      const emAndamento = indicador.trimestre === trimestreAtual;
      if (emAndamento && !indicador.linha.hasAttribute('aria-current')) {
        indicador.linha.setAttribute('aria-current', 'step');
      } else if (!emAndamento && indicador.linha.hasAttribute('aria-current')) {
        indicador.linha.removeAttribute('aria-current');
      }

      const nome = indicador.id === 'mes' ? capitalizar(formatoMes.format(agora)) : indicador.nome;
      const blocos = formatoNumero.format(completos);
      const totalDeBlocos = formatoNumero.format(total);
      const duracao = `${formatarDuracao(minutosDecorridos)} de ${formatarDuracao(minutosDoPeriodo)}`;
      atualizarTexto(indicador.titulo, nome);
      atualizarTexto(indicador.numero, ` ${rotulo}%`);
      atualizarTexto(indicador.detalhe, emAndamento ? `${duracao} · trimestre atual` : duracao);
      atualizarTexto(indicador.formula, `${blocos} ÷ ${totalDeBlocos} × 100 = ${formatoNumero.format(percentual)}%`);
    }
  }

  function dataLocalIso(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  // A conferência de ida e volta evita aceitar datas como 30 de fevereiro.
  function lerDataDoCadastro(campo) {
    const iso = campo?.dateTime;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const [ano, mes, dia] = iso.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
    return dataLocalIso(data) === iso ? { iso, instante: data } : null;
  }

  function lerFeriados() {
    const itens = document.getElementById('feriados-nacionais-dados').content.querySelectorAll('li');
    const dados = [];
    for (const item of itens) {
      const data = lerDataDoCadastro(item.querySelector('time'));
      const nome = item.textContent.trim();
      if (data && nome) dados.push({ data, nome });
    }
    return dados.sort((primeiro, segundo) => primeiro.data.iso.localeCompare(segundo.data.iso));
  }

  function lerPeriodosDeMercurio() {
    const itens = document.getElementById('mercurio-retrogrado-dados').content.querySelectorAll('li');
    const dados = [];
    for (const item of itens) {
      const [campoInicio, campoFim] = item.querySelectorAll('time');
      const inicio = lerDataDoCadastro(campoInicio);
      const fim = lerDataDoCadastro(campoFim);
      if (inicio && fim && inicio.iso <= fim.iso) dados.push({ inicio, fim });
    }
    return dados.sort((primeiro, segundo) => primeiro.inicio.iso.localeCompare(segundo.inicio.iso));
  }

  function criarDataVisivel({ iso, instante }) {
    const time = elemento('time', formatoData.format(instante));
    time.dateTime = iso;
    return time;
  }

  function renderizarFeriados() {
    const total = feriadosRestantes.length;
    const totalDePaginas = Math.ceil(total / FERIADOS_POR_PAGINA);
    const inicio = paginaFeriados * FERIADOS_POR_PAGINA;
    const fim = Math.min(inicio + FERIADOS_POR_PAGINA, total);

    const itens = feriadosRestantes.slice(inicio, fim).map((feriado, indice) => {
      const linha = elemento('li');
      const nome = inicio + indice === 0 ? elemento('strong', feriado.nome) : feriado.nome;
      const semana = formatoDiaDaSemana.format(feriado.data.instante);
      linha.append(criarDataVisivel(feriado.data), ' · ', nome, ` · ${capitalizar(semana)}`);
      return linha;
    });
    listaFeriados.replaceChildren(...itens);

    avisoFeriados.hidden = total > 0;
    statusFeriados.hidden = total === 0;
    paginacaoFeriados.hidden = totalDePaginas <= 1;
    paginaAnterior.disabled = paginaFeriados === 0;
    proximaPagina.disabled = paginaFeriados + 1 >= totalDePaginas;
    const faixa = inicio + 1 === fim ? String(fim) : `${inicio + 1}–${fim}`;
    const unidade = total === 1 ? 'feriado' : 'feriados';
    statusFeriados.textContent = total ? `${faixa} de ${total} ${unidade}` : '';
  }

  function atualizarFeriados(hoje) {
    const ano = hoje.slice(0, 4);
    if (anoFeriados.textContent !== ano) paginaFeriados = 0;
    atualizarTexto(anoFeriados, ano);

    // O feriado de hoje faz parte da lista. Datas do próximo ano entram em janeiro.
    feriadosRestantes = feriados.filter(feriado => feriado.data.iso.startsWith(`${ano}-`) && feriado.data.iso >= hoje);
    const ultimaPagina = Math.ceil(feriadosRestantes.length / FERIADOS_POR_PAGINA) - 1;
    paginaFeriados = Math.max(0, Math.min(paginaFeriados, ultimaPagina));
    renderizarFeriados();
  }

  function atualizarPeriodosDeMercurio(hoje) {
    // O último dia faz parte do período. Após a virada, entra o próximo do cadastro.
    const proximos = periodosDeMercurio.filter(periodo => periodo.fim.iso >= hoje).slice(0, MAXIMO_PERIODOS_DE_MERCURIO);
    const itens = proximos.map(({ inicio, fim }) => {
      const linha = elemento('li');
      linha.append(criarDataVisivel(inicio), ' até ', criarDataVisivel(fim));
      if (inicio.iso <= hoje) linha.append(' · ', elemento('strong', 'Em andamento'));
      return linha;
    });
    listaMercurio.replaceChildren(...itens);
    avisoMercurio.hidden = itens.length > 0;
  }

  const linhasDosIndicadores = montarLinhasDosIndicadores();
  const feriados = lerFeriados();
  const periodosDeMercurio = lerPeriodosDeMercurio();
  let feriadosRestantes = [];
  let paginaFeriados = 0;
  let ultimaDataExibida;

  paginaAnterior.addEventListener('click', () => {
    paginaFeriados -= 1;
    renderizarFeriados();
  });
  proximaPagina.addEventListener('click', () => {
    paginaFeriados += 1;
    renderizarFeriados();
  });

  function atualizarMolde() {
    const agora = new Date();
    const hoje = dataLocalIso(agora);
    relogio.dateTime = `${hoje}T${agora.toTimeString().slice(0, 8)}`;
    atualizarTexto(relogio, agora.toLocaleString('pt-BR'));
    atualizarTexto(tempoRestante, formatarDuracao(calcularMinutosAteMeiaNoite(agora)));
    atualizarIndicadores(agora);

    if (hoje !== ultimaDataExibida) {
      atualizarFeriados(hoje);
      atualizarPeriodosDeMercurio(hoje);
      ultimaDataExibida = hoje;
    }
  }

  atualizarMolde();
  setInterval(atualizarMolde, 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) atualizarMolde();
  });
})();
