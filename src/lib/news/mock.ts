import type { NewsArticle } from "./types";

export function getMockNews(): NewsArticle[] {
  return [
    {
      title: "Liverpool extend Premier League lead with dominant display",
      link: "https://www.bbc.co.uk/sport/football/liverpool-1",
      pubDate: new Date(Date.now() - 3600000).toISOString(),
      contentSnippet:
        "Liverpool moved further clear at the top of the Premier League after a convincing victory at Anfield.",
      thumbnail: undefined,
      source: "bbc",
      language: "en",
    },
    {
      title: "Salah reaches 200 Premier League goal milestone",
      link: "https://www.bbc.co.uk/sport/football/liverpool-2",
      pubDate: new Date(Date.now() - 86400000).toISOString(),
      contentSnippet:
        "Mohamed Salah became the first African player to score 200 Premier League goals.",
      thumbnail: undefined,
      source: "guardian",
      language: "en",
    },
    {
      title: "Liverpool chien thang thuyet phuc truoc doi thu canh tranh",
      link: "https://bongda.com.vn/liverpool-mock-1",
      pubDate: new Date(Date.now() - 172800000).toISOString(),
      contentSnippet:
        "Liverpool da co chien thang an tuong tai vong 25 Premier League.",
      thumbnail: undefined,
      source: "bongda",
      language: "vi",
    },
    {
      title: "Van Dijk signs new long-term deal at Anfield",
      link: "https://www.bbc.co.uk/sport/football/liverpool-3",
      pubDate: new Date(Date.now() - 259200000).toISOString(),
      contentSnippet:
        "Virgil van Dijk has committed his future to Liverpool by signing an extended contract.",
      thumbnail: undefined,
      source: "bbc",
      language: "en",
    },
    {
      title: "Arne Slot va ke hoach chuyen nhuong he 2026 cua Liverpool",
      link: "https://cdn.24h.com.vn/tin-tuc/liverpool-mock-1",
      pubDate: new Date(Date.now() - 345600000).toISOString(),
      contentSnippet:
        "HLV Arne Slot chia se ve ke hoach bo sung luc luong mua he.",
      thumbnail: undefined,
      source: "24h",
      language: "vi",
    },
    {
      title:
        "Champions League last-16 preview: Liverpool's European journey continues",
      link: "https://www.bbc.co.uk/sport/football/liverpool-4",
      pubDate: new Date(Date.now() - 432000000).toISOString(),
      contentSnippet:
        "Liverpool prepare for their Champions League knockout tie with high spirits.",
      thumbnail: undefined,
      source: "guardian",
      language: "en",
    },
  ];
}
