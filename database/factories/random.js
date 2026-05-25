const firstNames = [
  "Ana",
  "Bruno",
  "Carla",
  "Diego",
  "Elisa",
  "Felipe",
  "Giovana",
  "Hugo",
  "Isabela",
  "Joao",
  "Karen",
  "Lucas",
  "Mariana",
  "Nicolas",
  "Olivia",
  "Pedro",
  "Rafaela",
  "Sergio",
  "Talita",
  "Victor",
];

const lastNames = [
  "Almeida",
  "Barbosa",
  "Carvalho",
  "Dias",
  "Esteves",
  "Ferreira",
  "Gomes",
  "Henrique",
  "Ibrahim",
  "Lima",
  "Mendes",
  "Nogueira",
  "Oliveira",
  "Pereira",
  "Queiroz",
  "Rocha",
  "Santana",
  "Teixeira",
  "Vieira",
  "Xavier",
];

const streetNames = [
  "Avenida Brasil",
  "Rua das Flores",
  "Rua do Sol",
  "Avenida Central",
  "Rua Primavera",
  "Rua dos Pinheiros",
  "Alameda Bela Vista",
  "Rua Santa Clara",
  "Travessa Harmonia",
  "Rua Integração",
];

const cityNames = [
  "Sao Paulo",
  "Campinas",
  "Santo Andre",
  "Sorocaba",
  "Ribeirao Preto",
  "Belo Horizonte",
  "Curitiba",
  "Porto Alegre",
  "Florianopolis",
  "Recife",
];

const treatmentNames = [
  "Limpeza preventiva",
  "Restauracao em resina",
  "Canal radicular",
  "Clareamento dental",
  "Exame de rotina",
  "Extracao simples",
  "Ajuste de aparelho",
  "Consulta de retorno",
  "Aplicacao de fluor",
  "Tratamento gengival",
];

const appointmentStatuses = [
  "Confirmado",
  "Aguardando confirmacao",
  "Concluido",
  "Falta",
  "Cancelado",
];

const paymentMethods = ["Dinheiro", "Credito", "PIX", "Transferencia"];

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pick(list) {
  return list[randomInt(0, list.length - 1)];
}

export function boolean(probability = 0.5) {
  return Math.random() < probability;
}

export function sample(list, count) {
  const copy = [...list];
  const result = [];

  while (copy.length > 0 && result.length < count) {
    const index = randomInt(0, copy.length - 1);
    result.push(copy.splice(index, 1)[0]);
  }

  return result;
}

export function fullName() {
  return `${pick(firstNames)} ${pick(lastNames)}`;
}

export function emailFromName(name) {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");

  return `${normalized}.${randomInt(100, 999)}@example.com`;
}

export function phoneNumber() {
  return `11 9${randomInt(1000, 9999)}-${randomInt(1000, 9999)}`;
}

export function cpf() {
  const digits = Array.from({ length: 11 }, () => randomInt(0, 9)).join("");
  return digits;
}

export function dateBetween(startDaysAgo, endDaysAgo = 0) {
  const now = Date.now();
  const start = now - startDaysAgo * 24 * 60 * 60 * 1000;
  const end = now - endDaysAgo * 24 * 60 * 60 * 1000;
  return new Date(randomInt(start, end));
}

export function futureDateBetween(minDaysAhead, maxDaysAhead) {
  const now = Date.now();
  const start = now + minDaysAhead * 24 * 60 * 60 * 1000;
  const end = now + maxDaysAhead * 24 * 60 * 60 * 1000;
  return new Date(randomInt(start, end));
}

export function address() {
  return `${pick(streetNames)}, ${randomInt(10, 999)}, ${pick(cityNames)} - SP`;
}

export function appointmentNotes() {
  return pick([
    "Paciente relatou sensibilidade ao frio.",
    "Retorno programado para avaliacao de evolução.",
    "Procedimento concluido sem intercorrencias.",
    "Solicitado acompanhamento em 30 dias.",
    "Agendamento feito para revisao geral.",
  ]);
}

export function clinicalNotes() {
  return pick([
    "Boa higiene oral, sem queixas relevantes.",
    "Necessita acompanhamento periodontal.",
    "Presenca de restauracao antiga em observacao.",
    "Paciente orientado sobre uso de fio dental.",
    "Reavaliar dor localizada na proxima consulta.",
  ]);
}

export function treatmentName() {
  return pick(treatmentNames);
}

export function appointmentStatus() {
  return pick(appointmentStatuses);
}

export function paymentMethod() {
  return pick(paymentMethods);
}

export function fileType() {
  return pick(["Exame", "Radiografia", "Foto"]);
}

export function fileUrl(index = 1) {
  return `https://example.com/uploads/odonto-${index}-${randomInt(1000, 9999)}.jpg`;
}
