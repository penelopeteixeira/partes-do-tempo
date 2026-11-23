(() => {
  const DURACAO_MINUTO_MS = 60 * 1000;
  const DURACAO_BLOCO_MINUTOS = 5;
  const DURACAO_BLOCO_MS = DURACAO_BLOCO_MINUTOS * DURACAO_MINUTO_MS;
  const DIAS_UTEIS_POR_SEMANA = 5;
  const FERIADOS_POR_PAGINA = 3;
  const MAXIMO_PERIODOS_DE_MERCURIO = 3;
  const TURNOS_UTEIS = [
    { inicio: 9 * 60, fim: 12 * 60 },
    { inicio: 13 * 60, fim: 18 * 60 },
  ];
  const MINUTOS_UTEIS_POR_DIA = TURNOS_UTEIS.reduce((total, turno) => total + turno.fim - turno.inicio, 0);

  const cartaoHoje = document.querySelector('[data-kpi="%_do_dia"]');
  const numeroDoDia = cartaoHoje?.querySelector('[data-kpi-valor]');
  const arcoDoDia = cartaoHoje?.querySelector('.tc-ring-value');
  const tempoRestante = cartaoHoje?.querySelector('[data-tempo-restante]');
  const semanaUtil = document.querySelector('[data-kpi="%_da_semana_util"]');
  const numeroDaSemanaUtil = semanaUtil?.querySelector('[data-kpi-valor]');
  const barraDaSemanaUtil = semanaUtil?.querySelector('progress');
  const semanaInteira = document.querySelector('[data-kpi="%_da_semana_inteira"]');
  const numeroDaSemanaInteira = semanaInteira?.querySelector('[data-kpi-valor]');
  const barraDaSemanaInteira = semanaInteira?.querySelector('progress');
  const metricaDoMes = document.querySelector('[data-kpi="%_do_mes"]');
  const tituloDoMes = document.getElementById('tc-month');
  const numeroDoMes = metricaDoMes?.querySelector('[data-kpi-valor]');
  const barraDoMes = metricaDoMes?.querySelector('progress');
  const numeroDoAno = document.querySelector('[data-kpi="%_do_ano"] [data-kpi-valor]');
  const trimestres = [1, 2, 3, 4].map(numero => {
    const item = document.querySelector(`[data-kpi="%_do_q${numero}"]`);
    return {
      numero,
      item,
      rotulo: item?.querySelector('[data-kpi-valor]'),
      barra: item?.querySelector('progress'),
    };
  });
  const dataAtual = document.getElementById('data-atual');
  const horaAtual = document.getElementById('hora-atual');
  const fonteDosFeriados = document.getElementById('feriados-nacionais-dados');
  const modelosDeFeriados = document.getElementById('feriados-nacionais-modelos')?.content;
  const modeloDePagina = modelosDeFeriados?.querySelector('.tc-holiday-page');
  const modeloDeFeriado = modelosDeFeriados?.querySelector('.tc-holiday');
  const paginasDeFeriados = document.querySelector('.tc-holiday-pages');
  const anoDosFeriados = document.querySelector('.tc-holiday-year');
  const avisoDeFeriados = document.getElementById('feriados-nacionais-vazio');
  const fonteDosPeriodos = document.getElementById('mercurio-retrogrado-dados');
  const modeloDePeriodo = document.getElementById('mercurio-retrogrado-modelo')?.content.querySelector('li');
  const listaDePeriodos = document.querySelector('.tc-retro-dates');
  const anoDosPeriodos = document.querySelector('.tc-mercury-year');
  const avisoDePeriodos = document.getElementById('mercurio-retrogrado-vazio');
  if (!numeroDoDia || !arcoDoDia || !tempoRestante || !dataAtual || !horaAtual) return;

  const formatoData = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const formatoMes = new Intl.DateTimeFormat('pt-BR', { month: 'long' });
  const formatoMesCurto = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
  const formatoDiaDaSemana = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' });
  const feriadosCadastrados = lerFeriadosCadastrados();
  const periodosDeMercurio = lerPeriodosDeMercurio();

  let ultimoProgressoDoDia;
  let ultimoMesExibido;
  let dataDoCalendario;

  function proximaMeiaNoite(agora) {
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + 1);
  }

  // Só os blocos completos de cinco minutos entram no progresso.
  function calcularProgressoEmBlocos(agora, inicio, fim) {
    const blocosDecorridos = Math.floor((agora - inicio) / DURACAO_BLOCO_MS);
    const blocosDoPeriodo = (fim - inicio) / DURACAO_BLOCO_MS;

    return (blocosDecorridos / blocosDoPeriodo) * 100;
  }

  // Usa as duas meias-noites locais para medir a duração real do dia.
  function calcularProgressoDoDia(agora) {
    const ano = agora.getFullYear();
    const mes = agora.getMonth();
    const dia = agora.getDate();
    const inicio = new Date(ano, mes, dia);
    const fim = proximaMeiaNoite(agora);
    return calcularProgressoEmBlocos(agora, inicio, fim);
  }

  // getDay() começa no domingo. O ajuste faz segunda valer 0 e domingo valer 6.
  function diasDesdeSegunda(agora) {
    return (agora.getDay() + 6) % 7;
  }

  // Mede a semana entre duas segundas-feiras à meia-noite no horário local.
  function calcularProgressoDaSemanaInteira(agora) {
    const ano = agora.getFullYear();
    const mes = agora.getMonth();
    const diaDaSegunda = agora.getDate() - diasDesdeSegunda(agora);
    const inicio = new Date(ano, mes, diaDaSegunda);
    const fim = new Date(ano, mes, diaDaSegunda + 7);

    return calcularProgressoEmBlocos(agora, inicio, fim);
  }

  // Soma as jornadas concluídas e a parte dos turnos de hoje que já passou.
  // A grade fixa soma 40 horas por semana, com o almoço fora da contagem.
  function calcularProgressoDaSemanaUtil(agora) {
    const diasUteisConcluidos = Math.min(diasDesdeSegunda(agora), DIAS_UTEIS_POR_SEMANA);
    let minutosUteis = diasUteisConcluidos * MINUTOS_UTEIS_POR_DIA;

    if (diasUteisConcluidos < DIAS_UTEIS_POR_SEMANA) {
      const minutoDoDia = agora.getHours() * 60 + agora.getMinutes();
      for (const turno of TURNOS_UTEIS) {
        // Cada turno contribui do seu início até o minuto atual, limitado ao seu fim.
        const ate = Math.min(minutoDoDia, turno.fim);
        minutosUteis += Math.max(0, ate - turno.inicio);
      }
    }

    const blocosDecorridos = Math.floor(minutosUteis / DURACAO_BLOCO_MINUTOS);
    const blocosDaSemanaUtil = (DIAS_UTEIS_POR_SEMANA * MINUTOS_UTEIS_POR_DIA) / DURACAO_BLOCO_MINUTOS;
    return (100 * blocosDecorridos) / blocosDaSemanaUtil;
  }

  // Os primeiros dias de cada mês dão o intervalo real, inclusive em anos bissextos.
  function calcularProgressoDoMes(agora) {
    const ano = agora.getFullYear();
    const mes = agora.getMonth();
    const inicio = new Date(ano, mes, 1);
    const fim = new Date(ano, mes + 1, 1);

    return calcularProgressoEmBlocos(agora, inicio, fim);
  }

  // Mede o ano entre dois dias 1º de janeiro à meia-noite no horário local.
  // A diferença entre as datas inclui o dia extra dos anos bissextos.
  function calcularProgressoDoAno(agora) {
    const ano = agora.getFullYear();
    const inicio = new Date(ano, 0, 1);
    const fim = new Date(ano + 1, 0, 1);

    return calcularProgressoEmBlocos(agora, inicio, fim);
  }

  // Cada trimestre tem três meses de calendário e usa sua própria duração.
  function calcularProgressoDoTrimestre(agora, trimestre) {
    const ano = agora.getFullYear();
    const mesInicial = (trimestre - 1) * 3;
    const inicio = new Date(ano, mesInicial, 1);
    const fim = new Date(ano, mesInicial + 3, 1);

    // Na virada, o trimestre anterior completa 100% e o novo começa em 0%.
    if (agora < inicio) return 0;
    if (agora >= fim) return 100;
    return calcularProgressoEmBlocos(agora, inicio, fim);
  }

  // Arredonda para cima para exibir um minuto restante até a virada do dia.
  function calcularMinutosAteMeiaNoite(agora) {
    const milissegundosRestantes = proximaMeiaNoite(agora) - agora;
    return Math.ceil(milissegundosRestantes / DURACAO_MINUTO_MS);
  }

  function atualizarTempoRestante(agora) {
    const minutosRestantes = calcularMinutosAteMeiaNoite(agora);
    const horas = Math.floor(minutosRestantes / 60);
    const minutos = String(minutosRestantes % 60).padStart(2, '0');
    const texto = `${horas}h ${minutos}min`;

    if (tempoRestante.textContent !== texto) tempoRestante.textContent = texto;
  }

  function obterDataLocalIso(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  function atualizarCabecalho(agora, dataIso) {
    const hora = agora.toTimeString().slice(0, 8);

    if (dataAtual.dateTime !== dataIso) {
      const partes = Object.fromEntries(formatoData.formatToParts(agora).map(({ type, value }) => [type, value]));
      const diaDaSemana = partes.weekday.charAt(0).toUpperCase() + partes.weekday.slice(1).replace(/\.$/, '');
      dataAtual.dateTime = dataIso;
      dataAtual.textContent = `${diaDaSemana}, ${partes.day} ${partes.month} ${partes.year}`;
    }

    if (horaAtual.dateTime !== hora) {
      horaAtual.dateTime = hora;
      horaAtual.textContent = hora;
    }
  }

  // O rótulo reserva 100% para períodos que de fato chegaram ao fim.
  function arredondarProgresso(progresso) {
    return progresso === 100 ? 100 : Math.min(99, Math.round(progresso));
  }

  function atualizarProgressoDoDia(agora) {
    const progresso = calcularProgressoDoDia(agora);
    if (progresso === ultimoProgressoDoDia) return;

    // O arco usa o valor exato para mostrar o avanço de cada bloco.
    numeroDoDia.textContent = arredondarProgresso(progresso);
    arcoDoDia.setAttribute('stroke-dasharray', `${progresso} 100`);
    arcoDoDia.setAttribute('visibility', progresso === 0 ? 'hidden' : 'visible');
    ultimoProgressoDoDia = progresso;
  }

  function atualizarBarraDeProgresso(numero, barra, progresso) {
    if (!numero || !barra || barra.value === progresso) return;

    numero.textContent = arredondarProgresso(progresso);
    barra.value = progresso;
  }

  function atualizarMes(agora) {
    const mes = agora.getMonth();
    if (tituloDoMes && mes !== ultimoMesExibido) {
      const nome = formatoMes.format(agora);
      tituloDoMes.textContent = nome.charAt(0).toUpperCase() + nome.slice(1);
      ultimoMesExibido = mes;
    }

    atualizarBarraDeProgresso(numeroDoMes, barraDoMes, calcularProgressoDoMes(agora));
  }

  function atualizarAno(agora) {
    if (!numeroDoAno) return;

    const percentual = String(arredondarProgresso(calcularProgressoDoAno(agora)));
    if (numeroDoAno.textContent !== percentual) numeroDoAno.textContent = percentual;
  }

  function atualizarTrimestres(agora) {
    const trimestreAtual = Math.floor(agora.getMonth() / 3) + 1;

    for (const { numero, item, rotulo, barra } of trimestres) {
      if (!item) continue;
      atualizarBarraDeProgresso(rotulo, barra, calcularProgressoDoTrimestre(agora, numero));

      if (numero === trimestreAtual) {
        if (item.getAttribute('aria-current') !== 'step') item.setAttribute('aria-current', 'step');
      } else {
        item.removeAttribute('aria-current');
      }
    }
  }

  // Interpreta AAAA-MM-DD como data local e descarta datas que o calendário ajustaria.
  function interpretarDataLocalIso(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;

    const [ano, mes, dia] = valor.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
    return obterDataLocalIso(data) === valor ? data : null;
  }

  function lerFeriadosCadastrados() {
    const feriados = [];
    const itens = fonteDosFeriados?.content.querySelectorAll('li') ?? [];
    for (const item of itens) {
      const dataIso = item.querySelector('time')?.dateTime;
      const nome = item.textContent.trim();
      const data = interpretarDataLocalIso(dataIso);
      if (nome && data) feriados.push({ data, dataIso, nome });
    }
    return feriados.sort((primeiro, segundo) => primeiro.dataIso.localeCompare(segundo.dataIso));
  }

  function criarItemDeFeriado(feriado, proximo) {
    const item = modeloDeFeriado.cloneNode(true);
    const data = item.querySelector('time');
    const nomeDoDia = formatoDiaDaSemana.format(feriado.data);

    data.dateTime = feriado.dataIso;
    data.querySelector('strong').textContent = feriado.dataIso.slice(-2);
    data.querySelector('span').textContent = formatoMesCurto.format(feriado.data).replace(/\.$/, '').toUpperCase();
    item.querySelector('.tc-holiday-name').textContent = feriado.nome;
    item.querySelector('small').textContent = nomeDoDia.charAt(0).toUpperCase() + nomeDoDia.slice(1);
    item.classList.toggle('tc-holiday-next', proximo);
    return item;
  }

  function configurarSetaDeFeriados(seta, paginaDeDestino) {
    if (paginaDeDestino > 0) {
      seta.href = `#feriados-pagina-${paginaDeDestino}`;
      seta.removeAttribute('aria-hidden');
    } else {
      seta.removeAttribute('href');
      seta.setAttribute('aria-hidden', 'true');
    }
  }

  function preencherPaginaDeFeriados(restantes, indice, totalDePaginas) {
    // Reutiliza a seção para manter o destino da seta e a página aberta na virada do dia.
    const pagina = paginasDeFeriados.children[indice] ?? modeloDePagina.cloneNode(true);
    const inicio = indice * FERIADOS_POR_PAGINA;
    const fim = Math.min(inicio + FERIADOS_POR_PAGINA, restantes.length);
    const intervalo = inicio + 1 === fim ? String(fim) : `${inicio + 1}–${fim}`;
    const unidade = restantes.length === 1 ? 'feriado' : 'feriados';
    const contagem = `${intervalo} de ${restantes.length} ${unidade}`;
    const itens = restantes.slice(inicio, fim).map((feriado, posicao) => criarItemDeFeriado(feriado, inicio + posicao === 0));

    pagina.id = `feriados-pagina-${indice + 1}`;
    pagina.setAttribute('aria-label', `Página ${indice + 1} de ${totalDePaginas}, ${contagem}`);
    pagina.querySelector('.tc-holiday-list').replaceChildren(...itens);
    pagina.querySelector('.tc-holiday-status').textContent = contagem;

    const navegacao = pagina.querySelector('.tc-holiday-pagination');
    const [anterior, proxima] = navegacao.querySelectorAll('a');
    navegacao.hidden = totalDePaginas <= 1;
    configurarSetaDeFeriados(anterior, indice);
    configurarSetaDeFeriados(proxima, indice + 1 < totalDePaginas ? indice + 2 : 0);

    if (!pagina.parentElement) paginasDeFeriados.append(pagina);
  }

  function atualizarFeriados(hoje) {
    if (!modeloDePagina || !modeloDeFeriado || !paginasDeFeriados || !anoDosFeriados || !avisoDeFeriados) return;

    // Em AAAA-MM-DD, a ordem do texto segue o calendário e inclui o dia de hoje.
    const ano = hoje.slice(0, 4);
    const restantes = feriadosCadastrados.filter(feriado => feriado.dataIso.startsWith(`${ano}-`) && feriado.dataIso >= hoje);
    const totalDePaginas = Math.ceil(restantes.length / FERIADOS_POR_PAGINA);

    anoDosFeriados.textContent = ano;
    paginasDeFeriados.hidden = totalDePaginas === 0;
    avisoDeFeriados.hidden = totalDePaginas > 0;

    while (paginasDeFeriados.children.length > totalDePaginas) paginasDeFeriados.lastElementChild.remove();
    for (let indice = 0; indice < totalDePaginas; indice += 1) {
      preencherPaginaDeFeriados(restantes, indice, totalDePaginas);
    }
  }

  function lerPeriodosDeMercurio() {
    const periodos = [];
    const itens = fonteDosPeriodos?.content.querySelectorAll('li') ?? [];
    for (const item of itens) {
      const [campoInicio, campoFim] = item.querySelectorAll('time');
      const inicioIso = campoInicio?.dateTime;
      const fimIso = campoFim?.dateTime;
      const inicio = interpretarDataLocalIso(inicioIso);
      const fim = interpretarDataLocalIso(fimIso);
      if (inicio && fim && inicioIso <= fimIso) periodos.push({ inicio, fim, inicioIso, fimIso });
    }
    return periodos.sort((primeiro, segundo) => primeiro.inicioIso.localeCompare(segundo.inicioIso));
  }

  function formatarDataDoPeriodo(data, exibirAno) {
    const rotulo = `${data.getDate()} ${formatoMesCurto.format(data)}`;
    return exibirAno ? `${rotulo} ${data.getFullYear()}` : rotulo;
  }

  function criarItemDePeriodo(periodo, hoje, exibirAno) {
    const item = modeloDePeriodo.cloneNode(true);
    const [inicio, fim] = item.querySelectorAll('time');
    const emAndamento = periodo.inicioIso <= hoje && hoje <= periodo.fimIso;

    inicio.dateTime = periodo.inicioIso;
    inicio.textContent = formatarDataDoPeriodo(periodo.inicio, exibirAno);
    fim.dateTime = periodo.fimIso;
    fim.textContent = formatarDataDoPeriodo(periodo.fim, exibirAno);
    item.toggleAttribute('data-em-andamento', emAndamento);
    item.querySelector('.tc-retro-status').hidden = !emAndamento;
    return item;
  }

  function atualizarPeriodosDeMercurio(hoje) {
    if (!modeloDePeriodo || !listaDePeriodos || !anoDosPeriodos || !avisoDePeriodos) return;

    // A data de fim conta por inteiro. O período sai na virada para o dia seguinte.
    const proximos = periodosDeMercurio
      .filter(periodo => periodo.fimIso >= hoje)
      .slice(0, MAXIMO_PERIODOS_DE_MERCURIO);
    const semPeriodos = proximos.length === 0;
    listaDePeriodos.hidden = semPeriodos;
    anoDosPeriodos.hidden = semPeriodos;
    avisoDePeriodos.hidden = !semPeriodos;

    if (semPeriodos) {
      listaDePeriodos.replaceChildren();
      return;
    }

    const anos = proximos.flatMap(periodo => [periodo.inicio.getFullYear(), periodo.fim.getFullYear()]);
    const primeiroAno = Math.min(...anos);
    const ultimoAno = Math.max(...anos);
    const exibirAnoNasDatas = primeiroAno !== ultimoAno;
    anoDosPeriodos.textContent = exibirAnoNasDatas ? `${primeiroAno}–${ultimoAno}` : primeiroAno;
    listaDePeriodos.replaceChildren(...proximos.map(periodo => criarItemDePeriodo(periodo, hoje, exibirAnoNasDatas)));
  }

  // Os dois cartões do calendário só precisam ser atualizados quando a data local muda.
  function atualizarCalendario(hoje) {
    if (dataDoCalendario === hoje) return;
    dataDoCalendario = hoje;
    atualizarFeriados(hoje);
    atualizarPeriodosDeMercurio(hoje);
  }

  function atualizarPainel() {
    const agora = new Date();
    const hoje = obterDataLocalIso(agora);
    atualizarCabecalho(agora, hoje);
    atualizarTempoRestante(agora);
    atualizarProgressoDoDia(agora);
    atualizarBarraDeProgresso(numeroDaSemanaInteira, barraDaSemanaInteira, calcularProgressoDaSemanaInteira(agora));
    atualizarBarraDeProgresso(numeroDaSemanaUtil, barraDaSemanaUtil, calcularProgressoDaSemanaUtil(agora));
    atualizarMes(agora);
    atualizarAno(agora);
    atualizarTrimestres(agora);
    atualizarCalendario(hoje);
  }

  atualizarPainel();
  setInterval(atualizarPainel, 1000);

  // Sincroniza o relógio logo que a aba volta ao primeiro plano.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) atualizarPainel();
  });
})();
