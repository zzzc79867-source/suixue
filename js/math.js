function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

const EXACT_FORMULAS = new Map(Object.entries({
  'pV = nRT': 'pV=nRT',
  'pV = (m/M)RT': 'pV=\\frac{m}{M}RT',
  'V = nRT / p': 'V=\\frac{nRT}{p}',
  'ρ = m/V = pM/(RT)': '\\rho=\\frac{m}{V}=\\frac{pM}{RT}',
  'Z = pV/(nRT)': 'Z=\\frac{pV}{nRT}',
  'Tr = T/Tc': 'T_\\mathrm{r}=\\frac{T}{T_\\mathrm{c}}',
  'pr = p/pc': 'p_\\mathrm{r}=\\frac{p}{p_\\mathrm{c}}',
  'pB = yB·p': 'p_\\mathrm{B}=y_\\mathrm{B}p',
  'VB = yB·V': 'V_\\mathrm{B}=y_\\mathrm{B}V',
  'ΔU = Q + W': '\\Delta U=Q+W',
  'H = U + pV': 'H=U+pV',
  'W = −p外·ΔV': 'W=-p_{\\text{外}}\\Delta V',
  'W = −pΔV = −nRΔT': 'W=-p\\Delta V=-nR\\Delta T',
  'Qv = ΔU': 'Q_V=\\Delta U',
  'Qp = ΔH': 'Q_p=\\Delta H',
  'W = −∫p dV': 'W=-\\int p\\,\\mathrm{d}V',
  'W = −nRT·ln(V2/V1)': 'W=-nRT\\ln\\frac{V_2}{V_1}',
  'Cp,m − Cv,m = R': 'C_{p,\\mathrm{m}}-C_{V,\\mathrm{m}}=R',
  'Cv,m = 3/2 R': 'C_{V,\\mathrm{m}}=\\frac{3}{2}R',
  'Cp,m = 5/2 R': 'C_{p,\\mathrm{m}}=\\frac{5}{2}R',
  'Cv,m = 5/2 R': 'C_{V,\\mathrm{m}}=\\frac{5}{2}R',
  'Cp,m = 7/2 R': 'C_{p,\\mathrm{m}}=\\frac{7}{2}R',
  'μJ-T = (∂T/∂p)H': '\\mu_{\\mathrm{J-T}}=\\left(\\frac{\\partial T}{\\partial p}\\right)_H',
  'ΔS = Qr/T': '\\Delta S=\\frac{Q_\\mathrm{r}}{T}',
  'ΔS = nR·ln(V2/V1)': '\\Delta S=nR\\ln\\frac{V_2}{V_1}',
  'ΔS = ΔfusH/T': '\\Delta S=\\frac{\\Delta_\\mathrm{fus}H}{T}',
  'G = H − TS': 'G=H-TS',
  'A = U − TS': 'A=U-TS',
  'S = k·lnΩ': 'S=k\\ln\\Omega',
  'dU = TdS − pdV': '\\mathrm{d}U=T\\,\\mathrm{d}S-p\\,\\mathrm{d}V',
  'dH = TdS + Vdp': '\\mathrm{d}H=T\\,\\mathrm{d}S+V\\,\\mathrm{d}p',
  'dA = −SdT − pdV': '\\mathrm{d}A=-S\\,\\mathrm{d}T-p\\,\\mathrm{d}V',
  'dG = −SdT + Vdp': '\\mathrm{d}G=-S\\,\\mathrm{d}T+V\\,\\mathrm{d}p',
  'η = 1 − T冷/T热': '\\eta=1-\\frac{T_{\\text{冷}}}{T_{\\text{热}}}',
  'ΔG = ΔH − TΔS': '\\Delta G=\\Delta H-T\\Delta S',
  'K°': 'K^{\\circ}',
  'Q/K°': '\\frac{Q}{K^{\\circ}}',
  'ΔrGm = RT·ln(Q/K°)': '\\Delta_\\mathrm{r}G_\\mathrm{m}=RT\\ln\\frac{Q}{K^{\\circ}}',
  'K° = p(CO₂)/p°': 'K^{\\circ}=\\frac{p_{\\mathrm{CO_2}}}{p^{\\circ}}',
  'F = C − P + 2': 'F=C-P+2',
  'dp/dT = ΔHm/(T·ΔVm)': '\\frac{\\mathrm{d}p}{\\mathrm{d}T}=\\frac{\\Delta H_\\mathrm{m}}{T\\Delta V_\\mathrm{m}}',
  'ln(p₂/p₁) = −ΔHm/R · (1/T₂ − 1/T₁)': '\\ln\\frac{p_2}{p_1}=-\\frac{\\Delta H_\\mathrm{m}}{R}\\left(\\frac{1}{T_2}-\\frac{1}{T_1}\\right)',
  'Π=cRT': '\\Pi=cRT',
  'Q = nF': 'Q=nF',
  'E = E° − (RT/nF)·lnQ': 'E=E^{\\circ}-\\frac{RT}{nF}\\ln Q',
  'ΔrGm = −nFE': '\\Delta_\\mathrm{r}G_\\mathrm{m}=-nFE',
  'ni = (N/q)·gi·e^(−εi/kT)': 'n_i=\\frac{N}{q}g_i\\mathrm{e}^{-\\varepsilon_i/kT}',
  'Δp = 2γ/r': '\\Delta p=\\frac{2\\gamma}{r}',
  't½ = ln2/k': 't_{1/2}=\\frac{\\ln 2}{k}',
  'k = A·e^(−Ea/RT)': 'k=A\\mathrm{e}^{-E_\\mathrm{a}/RT}',
  'U1/U2 = N1/N2': '\\frac{U_1}{U_2}=\\frac{N_1}{N_2}',
  'I1/I2 ≈ N2/N1': '\\frac{I_1}{I_2}\\approx\\frac{N_2}{N_1}',
  'n0 = 60f/p': 'n_0=\\frac{60f}{p}',
  's = (n0 − n)/n0': 's=\\frac{n_0-n}{n_0}',
  'k = N1/N2 ≈ U1/U2': 'k=\\frac{N_1}{N_2}\\approx\\frac{U_1}{U_2}',
  'uo = −(Rf/R1)·ui': 'u_\\mathrm{o}=-\\frac{R_\\mathrm{f}}{R_1}u_\\mathrm{i}',
  'u+ = u−': 'u_{+}=u_{-}',
  'i+ = i− = 0': 'i_{+}=i_{-}=0'
}));

function replaceTokens(value) {
  let text = value;
  const rules = [
    [/Δr([A-Z])m°/g, '\\Delta_\\mathrm{r}$1_\\mathrm{m}^\\circ'],
    [/Δr([A-Z])m\b/g, '\\Delta_\\mathrm{r}$1_\\mathrm{m}'],
    [/ΔfusH/g, '\\Delta_\\mathrm{fus}H'],
    [/Δ相变H/g, '\\Delta_\\text{相变}H'],
    [/ΔfHm°/g, '\\Delta_\\mathrm{f}H_\\mathrm{m}^\\circ'],
    [/Sm°/g, 'S_\\mathrm{m}^\\circ'],
    [/μJ-T/g, '\\mu_{\\mathrm{J-T}}'],
    [/C([pv]),m/g, 'C_{$1,\\mathrm{m}}'],
    [/Q([pv])\b/g, 'Q_{$1}'],
    [/p外/g, 'p_{\\text{外}}'],
    [/T(冷|热)/g, 'T_{\\text{$1}}'],
    [/\b([pTVyVUINnR])B\b/g, '$1_{\\mathrm{B}}'],
    [/\bTc\b/g, 'T_{\\mathrm{c}}'],
    [/\bTr\b/g, 'T_{\\mathrm{r}}'],
    [/\bpr\b/g, 'p_{\\mathrm{r}}'],
    [/\bpc\b/g, 'p_{\\mathrm{c}}'],
    [/\b([pn])0\b/g, '$1_0'],
    [/\b([UNIkp])([12])\b/g, '$1_{$2}'],
    [/\b([UIp])l\b/g, '$1_{\\mathrm{l}}'],
    [/\b([UIp])p\b/g, '$1_{\\mathrm{p}}'],
    [/\bRf\b/g, 'R_{\\mathrm{f}}'],
    [/\b([uv])([io])\b/g, '$1_{\\mathrm{$2}}'],
    [/\bCH4\b/g, '\\mathrm{CH_4}'],
    [/\bC2H6\b/g, '\\mathrm{C_2H_6}'],
    [/\bC4H10\b/g, '\\mathrm{C_4H_{10}}'],
    [/\bCaCO3\b/g, '\\mathrm{CaCO_3}'],
    [/\bCaO\b/g, '\\mathrm{CaO}'],
    [/\bK°\b/g, 'K^\\circ'],
    [/\bp°\b/g, 'p^\\circ'],
    [/\bln\b/g, '\\ln ']
  ];
  for (const [pattern, replacement] of rules) text = text.replace(pattern, replacement);
  return text;
}

function toTex(input) {
  const normalized = String(input ?? '').trim().replace(/\s+/g, ' ');
  if (EXACT_FORMULAS.has(normalized)) return EXACT_FORMULAS.get(normalized);
  return replaceTokens(normalized);
}

export function renderMath(input, display = false) {
  try {
    if (!window.katex) throw new Error('KaTeX unavailable');
    const html = window.katex.renderToString(toTex(input), {
      displayMode: display,
      output: 'html',
      strict: false,
      throwOnError: false,
      trust: false
    });
    return `<span class="math ${display ? 'math-display' : 'math-inline'}">${html}</span>`;
  } catch (error) {
    return `<span class="math math-fallback">${escapeHtml(input)}</span>`;
  }
}
