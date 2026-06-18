export interface Article {
  titleKey: string
  url: string
  topics: string[]
}

const UTM = '?utm_source=formaciones-app&utm_medium=app&utm_campaign=pedagogia'

export const ARTICLES: Article[] = [
  {
    titleKey: 'articles.space_usage',
    url: `https://diegopoleo.com/crewleaders/${UTM}`,
    topics: ['espacio', 'formaciones'],
  },
  {
    titleKey: 'articles.level_composition',
    url: `https://diegopoleo.com/carta-abierta-a-las-familias/${UTM}`,
    topics: ['niveles', 'formaciones'],
  },
  {
    titleKey: 'articles.transitions_guide',
    url: `https://diegopoleo.com/modoviaje/${UTM}`,
    topics: ['transiciones', 'formaciones'],
  },
]

export function getArticlesByTopics(topics: string[]): Article[] {
  return ARTICLES.filter(a => a.topics.some(t => topics.includes(t)))
}
