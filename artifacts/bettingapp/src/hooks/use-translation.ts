import { useState, useEffect } from "react";

type Language = "en" | "sw";

const translations = {
  en: {
    "login": "Login",
    "register": "Register",
    "my_bets": "My Bets",
    "deposit": "Deposit",
    "profile": "Profile",
    "admin": "Admin",
    "place_bet": "Place Bet",
    "home": "Home",
    "draw": "Draw",
    "away": "Away",
    "balance": "Balance",
    "amount": "Amount",
    "phone": "Phone",
    "password": "Password",
    "submit": "Submit",
    "approve": "Approve",
    "reject": "Reject",
    "settle": "Settle",
    "won": "Won",
    "lost": "Lost",
    "pending": "Pending",
    "events": "Events",
    "logout": "Logout",
    "transaction_id": "Transaction ID",
    "bet_slip": "Bet Slip",
    "empty_slip": "Your bet slip is empty",
    "total_stake": "Total Stake",
    "potential_win": "Potential Win",
    "name": "Name",
    "total_bets": "Total Bets",
    "won_bets": "Won Bets",
    "lost_bets": "Lost Bets",
    "pending_bets": "Pending Bets",
    "total_wagered": "Total Wagered",
    "total_won": "Total Won",
    "method": "Method",
    "status": "Status",
    "date": "Date",
    "team_home": "Home Team",
    "team_away": "Away Team",
    "league": "League",
    "odds_home": "Home Odds",
    "odds_draw": "Draw Odds",
    "odds_away": "Away Odds",
    "create_event": "Create Event",
    "match": "Match",
    "outcome": "Outcome",
    "actions": "Actions",
    "stats": "Stats",
    "users": "Users",
    "deposits": "Deposits",
    "bets": "Bets",
    "total_users": "Total Users",
    "active_bets": "Active Bets",
    "total_deposited": "Total Deposited",
    "total_paid_out": "Total Paid Out",
    "no_events": "No active events right now.",
    "no_bets": "You have no bets.",
    "no_deposits": "You have no deposits.",
  },
  sw: {
    "login": "Ingia",
    "register": "Jisajili",
    "my_bets": "Mabeti Yangu",
    "deposit": "Weka Pesa",
    "profile": "Wasifu",
    "admin": "Msimamizi",
    "place_bet": "Weka Beti",
    "home": "Nyumbani",
    "draw": "Sare",
    "away": "Wageni",
    "balance": "Salio",
    "amount": "Kiasi",
    "phone": "Simu",
    "password": "Nywila",
    "submit": "Wasilisha",
    "approve": "Idhinisha",
    "reject": "Kataa",
    "settle": "Maliza",
    "won": "Umeshinda",
    "lost": "Umeshindwa",
    "pending": "Inasubiri",
    "events": "Mechi",
    "logout": "Toka",
    "transaction_id": "Nambari ya Muamala",
    "bet_slip": "Tiketi ya Beti",
    "empty_slip": "Tiketi yako ni tupu",
    "total_stake": "Jumla ya Dau",
    "potential_win": "Ushindi Unaotarajiwa",
    "name": "Jina",
    "total_bets": "Mabeti Jumla",
    "won_bets": "Mabeti Yaliyoshinda",
    "lost_bets": "Mabeti Yaliyoshindwa",
    "pending_bets": "Mabeti Yanayosubiri",
    "total_wagered": "Jumla ya Dau Lote",
    "total_won": "Jumla Uliyoshinda",
    "method": "Njia",
    "status": "Hali",
    "date": "Tarehe",
    "team_home": "Timu ya Nyumbani",
    "team_away": "Timu ya Ugenini",
    "league": "Ligi",
    "odds_home": "Odds za Nyumbani",
    "odds_draw": "Odds za Sare",
    "odds_away": "Odds za Ugenini",
    "create_event": "Tengeneza Mechi",
    "match": "Mechi",
    "outcome": "Matokeo",
    "actions": "Vitendo",
    "stats": "Takwimu",
    "users": "Watumiaji",
    "deposits": "Amana",
    "bets": "Mabeti",
    "total_users": "Jumla ya Watumiaji",
    "active_bets": "Mabeti Yaliyopo",
    "total_deposited": "Jumla ya Amana",
    "total_paid_out": "Jumla Iliyolipwa",
    "no_events": "Hakuna mechi kwa sasa.",
    "no_bets": "Huna mabeti yoyote.",
    "no_deposits": "Huna amana zozote.",
  }
};

export function useTranslation() {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("bettz_lang") as Language;
    if (saved === "en" || saved === "sw") {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: Language) => {
    localStorage.setItem("bettz_lang", newLang);
    setLangState(newLang);
  };

  const t = (key: keyof typeof translations["en"]) => {
    return translations[lang][key] || key;
  };

  return { t, lang, setLang };
}