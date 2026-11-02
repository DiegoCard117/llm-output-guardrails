# llm-output-guardrails

[English](README.md)

Um exemplo pequeno em TypeScript / ESM, inspirado num app em produção. Sugere passeios de um dia a partir de uma lista fechada de lugares do servidor. Cloudbank é uma cidade fictícia com coordenadas inventadas. Não usa LLM, serviço externo, credenciais nem banco: `cleanPlan` recebe uma resposta já interpretada como `unknown`.

O modelo erra com confiança: IDs, datas e horários inventados podem parecer convincentes. Um esquema JSON limita a forma, mas não prova que o conteúdo corresponde aos dados do servidor ou às restrições do dia. `RESPONSE_SCHEMA` descreve a resposta pedida; o exemplo confere a resposta em tempo de execução sem biblioteca de esquemas.

O modelo escolhe; o servidor é a fonte da verdade. Cada parada aceita referencia o objeto `Place` original da lista do servidor. Campos extras enviados pelo modelo, incluindo nome, endereço e coordenadas, são ignorados. `toRecords` busca esses dados no objeto do servidor.

## Dados enviados ao modelo

`buildModelInput` serializa uma seleção explícita de campos:

- Datas pedidas, ritmo (`relaxed`, `balanced` ou `busy`) e interesses da lista `nature`, `history`, `art`, `food`. Outros interesses são descartados.
- Lugares como `{ id, name, kind, lat, lng }`, com coordenadas arredondadas a três casas decimais.
- Reservas das datas pedidas como `{ time, lat, lng }`, também arredondadas, preservando coordenadas `null`.

Não envie endereços, nomes de pessoas, contatos, notas nem texto livre do usuário. Texto livre também pode carregar instruções de prompt injection. Propriedades extras da entrada nunca são espalhadas no objeto serializado. Nomes de lugares são dados confiáveis do catálogo do servidor; mantenha esse catálogo sob controle. Arredondar reduz a precisão, mas não anonimiza a localização.

`SYSTEM_RULES` pede ao modelo que respeite as restrições. Essas instruções orientam; a validação no servidor faz cumprir as regras. Horários HH:MM válidos podem ser propostos porque este exemplo não tem uma lista fechada de horários disponíveis.

## Regras de validação

Os testes estão em [test/guardrails.test.ts](test/guardrails.test.ts); seus nomes começam com o número da regra correspondente.

| Regra | Por quê | Teste que cobre |
| --- | --- | --- |
| 1. Raiz malformada vira plano vazio; pular dias e paradas malformados | Preservar entradas válidas sem derrubar o fluxo | `1: handles malformed input…` |
| 2. Só datas pedidas | O modelo não pode ampliar o período | `2: removes dates…` |
| 3. Só IDs de lugares conhecidos | Lugar inventado não tem dados oficiais | `3: removes invented place IDs…` |
| 4. Cada lugar uma vez no plano | Evitar sugestões repetidas | `4: keeps the first eligible occurrence…` |
| 5. HH:MM válido, de 00:00 a 23:59 | Uma string pode conter horário impossível | `5: accepts only zero-padded HH:MM…` |
| 6. Tirar horários ocupados naquela data | Reservas existentes têm prioridade | `6: removes occupied times…` |
| 7. Tirar paradas longe do medoide do dia | Limitar pontos geograficamente isolados | `7: uses the daily medoid…` |
| 8. Motivo limitado a 200 caracteres, como texto | Limitar texto exibido e evitar interpretar HTML | `8: limits reasons…` |
| 9. Ordenar datas e horários; omitir dias vazios | Produzir sugestão previsível | `9: sorts dates and times…` |
| Registros usam campos do servidor | Nome e endereço do modelo não podem chegar à gravação | `toRecords takes names…` |
| Prompt contém só os campos selecionados | Minimizar exposição e excluir texto livre | `buildModelInput sends only allowlisted fields…` |

Uma resposta que não seja objeto com um array `days` vira plano vazio. Dias e paradas malformados são pulados; entradas válidas passam pelas verificações de conteúdo. IDs repetidos ficam com a primeira ocorrência elegível na ordem da resposta; o filtro de distância vem depois e não tenta recuperar duplicatas posteriores. Entradas da mesma data são reunidas antes do filtro de distância.

O medoide do dia é o ponto existente com a menor soma de distâncias haversine a todos os demais. Os pontos incluem sugestões aceitas e reservas com ambas as coordenadas. Empates ficam com o primeiro ponto, com sugestões antes das reservas. Com menos de três pontos, não há filtro de distância. Caso contrário, saem sugestões a mais de `maxKm` do medoide (padrão: 3 km); reservas nunca são alteradas. A validação usa as coordenadas completas do servidor.

Motivos continuam strings literais: esta biblioteca não renderiza nem sanitiza HTML. A tela deve usar `textContent` ou interpolação normal de texto do framework, nunca `innerHTML` ou recurso equivalente de HTML bruto. O teste com marcação literal verifica o contrato de texto; a interface consumidora precisa de suas próprias verificações de renderização.

## Confirmação humana antes de gravar

O fluxo esperado é: catálogo do servidor → entrada mínima para o modelo → resposta não confiável → `cleanPlan` → sugestão exibida como texto → confirmação humana → `toRecords` → gravação no banco. Nada neste repositório salva dados. `toRecords` apenas cria registros; use-o para persistência após a confirmação. Num sistema real, confira novamente os dados do servidor e as reservas na hora de gravar, pois podem ter mudado desde a prévia.

## Como rodar

Depois de instalar as dependências de desenvolvimento declaradas no seu ambiente:

```sh
npm test
npm run typecheck
npm run demo
# Ou:
npx tsx examples/demo.ts
```

A demo imprime uma resposta maliciosa/errada e a sugestão limpa. Inclui lugar inventado, data fora, `25:00`, horário ocupado, duplicata, lugar a cerca de 40 km e nome/endereço falsos. Sobram apenas jardim e museu próximos, em ordem de horário, com os dados do servidor.

## Limitações

É um exemplo didático. Haversine mede distância em linha reta, não tempo de deslocamento nem disponibilidade de rotas. Não verifica horário de funcionamento, duração de visita, sobreposição de intervalos, fusos, acessibilidade nem horários repetidos entre sugestões novas. Conflitos com reservas comparam apenas strings de horário iguais. O medoide é uma heurística simples de custo quadrático, e dias com poucos pontos podem manter paradas distantes. Pressupõe datas e coordenadas válidas, `maxKm` finito e não negativo, e IDs únicos fornecidos pelo servidor. Recebe objetos, não strings JSON brutas; interpretar JSON cabe à fronteira de entrada. Não é um sistema completo de reservas.

MIT © 2026 DiegoCard117.
