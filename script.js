let planComptable = [];
let chapitresData = [];
let exerciceData = {};
let comptesParID = {};
let ecrituresParID = {};

// ============================================================
// CHARGEMENT INITIAL
// ============================================================

async function chargerJSON() {
  try {
    [planComptable, chapitresData] = await Promise.all([
      fetch("planctb.json").then(r => {
        if (!r.ok) throw new Error("Impossible de charger planctb.json");
        return r.json();
      }),
      fetch("chapitres.json").then(r => {
        if (!r.ok) throw new Error("Impossible de charger chapitres.json");
        return r.json();
      })
    ]);

    construireComptesParID();
    initialiserBoutonsSelection();
    initialiserBoutonsVues();
    initialiserChoixChapitre();
    initialiserAide();
    viderInterface();
    afficherVue("detail");
  } catch (erreur) {
    console.error(erreur);
    viderInterfaceAvecMessage("Erreur de chargement des fichiers JSON.");
  }
}

async function chargerExercice() {
  const selecteurExercice = document.getElementById("choix-exercice");
  if (!selecteurExercice || !selecteurExercice.value) {
    exerciceData = {};
    ecrituresParID = {};
    viderInterface();
    return;
  }

  const fichierExercice = selecteurExercice.value;
  exerciceData = await fetch(fichierExercice).then(r => {
    if (!r.ok) throw new Error(`Impossible de charger ${fichierExercice}`);
    return r.json();
  });

  construireEcrituresParID();
  configurerVues();
  afficherListeEcritures();
  decocherToutesLesEcritures();
  mettreAJour();
}

// ============================================================
// AIDE
// ============================================================

function initialiserAide() {
  const btnAide = document.getElementById("btn-aide");
  const btnFermer = document.getElementById("btn-fermer-aide");
  const fond = document.getElementById("modale-aide-fond");

  if (btnAide) btnAide.addEventListener("click", ouvrirAide);
  if (btnFermer) btnFermer.addEventListener("click", fermerAide);
  if (fond) fond.addEventListener("click", fermerAide);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") fermerAide();
  });
}

function ouvrirAide() {
  const modale = document.getElementById("modale-aide");
  if (!modale) return;
  modale.classList.add("ouverte");
  modale.setAttribute("aria-hidden", "false");
}

function fermerAide() {
  const modale = document.getElementById("modale-aide");
  if (!modale) return;
  modale.classList.remove("ouverte");
  modale.setAttribute("aria-hidden", "true");
}

// ============================================================
// NAVIGATION PAR CHAPITRE
// ============================================================

function initialiserChoixChapitre() {
  const selecteurChapitre = document.getElementById("choix-chapitre");
  const selecteurExercice = document.getElementById("choix-exercice");
  if (!selecteurChapitre || !selecteurExercice) return;

  selecteurChapitre.innerHTML = "";
  selecteurChapitre.appendChild(new Option("-- Sélectionner un chapitre --", ""));

  chapitresData.forEach(chapitre => {
    const option = new Option(chapitre.Titre, chapitre.ChapitreID);
    selecteurChapitre.appendChild(option);
  });

  selecteurExercice.innerHTML = "";
  selecteurExercice.appendChild(new Option("-- Sélectionner un exercice --", ""));
  selecteurExercice.disabled = true;

  selecteurChapitre.addEventListener("change", () => {
    peuplerExercices();
    exerciceData = {};
    ecrituresParID = {};
    viderInterface();
  });

  selecteurExercice.addEventListener("change", chargerExercice);
}

function peuplerExercices() {
  const selecteurChapitre = document.getElementById("choix-chapitre");
  const selecteurExercice = document.getElementById("choix-exercice");
  if (!selecteurChapitre || !selecteurExercice) return;

  selecteurExercice.innerHTML = "";
  selecteurExercice.appendChild(new Option("-- Sélectionner un exercice --", ""));
  selecteurExercice.disabled = true;

  if (!selecteurChapitre.value) return;

  const chapitreID = Number(selecteurChapitre.value);
  const chapitre = chapitresData.find(c => Number(c.ChapitreID) === chapitreID);

  if (!chapitre || !Array.isArray(chapitre.Exercices)) return;

  chapitre.Exercices.forEach(exercice => {
    const option = new Option(exercice.Libelle, exercice.Fichier);
    selecteurExercice.appendChild(option);
  });

  selecteurExercice.disabled = false;
}

function obtenirChapitreActif() {
  const selecteurChapitre = document.getElementById("choix-chapitre");
  if (!selecteurChapitre || !selecteurChapitre.value) return null;

  const chapitreID = Number(selecteurChapitre.value);
  return chapitresData.find(c => Number(c.ChapitreID) === chapitreID) || null;
}

function obtenirTypeExercice() {
  const chapitre = obtenirChapitreActif();

  return exerciceData?.Meta?.TypeExercice
    || chapitre?.TypeExercice
    || "fabrication-continue";
}

function configurerVues() {
  const chapitre = obtenirChapitreActif();

  const vuesActives =
    exerciceData?.Configuration?.VuesActives
    || chapitre?.VuesActives
    || ["detail", "ouverture", "comptes-t", "bv", "bilan", "resultats", "cout-fabrication"];

  document.querySelectorAll(".btn-vue").forEach(bouton => {
    const vue = bouton.dataset.vue;
    bouton.style.display = vuesActives.includes(vue) ? "" : "none";
  });

  const vueCourante = document.querySelector(".btn-vue.active");
  if (vueCourante && vueCourante.style.display === "none") {
    afficherVue(vuesActives[0] || "detail");
  }
}

// ============================================================
// CONSTRUCTION DES DICTIONNAIRES
// ============================================================

function construireComptesParID() {
  comptesParID = {};

  planComptable.forEach(compte => {
    comptesParID[compte.CompteID] = compte;
  });
}

function construireEcrituresParID() {
  ecrituresParID = {};

  (exerciceData.Ecritures || []).forEach(ecriture => {
    ecrituresParID[ecriture.IDEcriture] = ecriture;
  });
}

// ============================================================
// INTERFACE — ÉCRITURES
// ============================================================

function afficherListeEcritures() {
  const zone = document.getElementById("liste-ecritures");
  if (!zone) return;

  zone.innerHTML = "";

  (exerciceData.Ecritures || []).forEach(ecriture => {
    const div = document.createElement("div");

    div.innerHTML = `
      <label class="ligne-ecriture">
        <input type="checkbox" value="${ecriture.IDEcriture}">
        <span class="id-ecriture">${ecriture.IDEcriture}</span>
        <span class="date-ecriture">${ecriture.Date}</span>
        <span class="libelle-ecriture">${ecriture.Libelle}</span>
      </label>
    `;

    zone.appendChild(div);
    div.querySelector("input").addEventListener("change", mettreAJour);
  });
}

function initialiserBoutonsSelection() {
  const btnToutCocher = document.getElementById("btn-tout-cocher");
  const btnToutDecocher = document.getElementById("btn-tout-decocher");

  if (btnToutCocher) {
    btnToutCocher.addEventListener("click", () => {
      document.querySelectorAll("#liste-ecritures input[type='checkbox']").forEach(c => {
        c.checked = true;
      });
      mettreAJour();
    });
  }

  if (btnToutDecocher) {
    btnToutDecocher.addEventListener("click", () => {
      decocherToutesLesEcritures();
      mettreAJour();
    });
  }
}

function decocherToutesLesEcritures() {
  document.querySelectorAll("#liste-ecritures input[type='checkbox']").forEach(c => {
    c.checked = false;
  });
}

function initialiserBoutonsVues() {
  document.querySelectorAll(".btn-vue").forEach(bouton => {
    bouton.addEventListener("click", () => {
      afficherVue(bouton.dataset.vue);
    });
  });
}

function afficherVue(nomVue) {
  document.querySelectorAll(".vue").forEach(vue => {
    vue.classList.remove("active");
  });

  document.querySelectorAll(".btn-vue").forEach(bouton => {
    bouton.classList.remove("active");
  });

  const vueActive = document.getElementById(`vue-${nomVue}`);
  const boutonActif = document.querySelector(`.btn-vue[data-vue="${nomVue}"]`);

  if (vueActive) vueActive.classList.add("active");
  if (boutonActif) boutonActif.classList.add("active");
}

function obtenirEcrituresCochees() {
  const cases = document.querySelectorAll("#liste-ecritures input[type='checkbox']:checked");
  return Array.from(cases).map(c => c.value);
}

function obtenirCompte(compteID) {
  return comptesParID[compteID] || null;
}

function obtenirCompteIDsComptesT() {
  const listeManuelle = exerciceData?.Affichage?.ComptesT;

  if (Array.isArray(listeManuelle) && listeManuelle.length > 0) {
    return [...new Set(listeManuelle.map(Number))].sort((a, b) => a - b);
  }

  const ids = new Set();

  (exerciceData.Ouverture || []).forEach(l => ids.add(Number(l.CompteID)));
  (exerciceData.Ecritures || []).forEach(e => {
    (e.Lignes || []).forEach(l => ids.add(Number(l.CompteID)));
  });

  return [...ids].sort((a, b) => a - b);
}

// ============================================================
// UTILITAIRES EXERCICE
// ============================================================

function obtenirAteliersExercice() {
  if (Array.isArray(exerciceData?.Configuration?.Ateliers)) {
    return exerciceData.Configuration.Ateliers;
  }

  if (Array.isArray(exerciceData?.Configuration_Ateliers)) {
    return exerciceData.Configuration_Ateliers;
  }

  return [];
}

// ============================================================
// MISE À JOUR CENTRALE
// ============================================================

function mettreAJour() {
  const ecrituresCochees = obtenirEcrituresCochees();
  const bv = construireBalanceVerification(exerciceData, comptesParID, ecrituresCochees);
  const calculs = calculerMontantsSelonTypeExercice(bv, ecrituresCochees);

  afficherDetailEcritures(ecrituresCochees);
  afficherSoldesOuverture();
  afficherComptesT(ecrituresCochees);
  afficherBalanceVerification(bv);
  afficherBilan(bv, calculs);
  afficherEtatResultats(calculs);
  afficherEtatCoutFabrication(calculs);
  afficherFichesFabrication(ecrituresCochees);
}

// ============================================================
// RÉINITIALISATION DE L'INTERFACE
// ============================================================

function viderInterface() {
  viderInterfaceAvecMessage("Veuillez choisir un chapitre, puis un exercice.");
}

function viderInterfaceAvecMessage(message) {
  const html = `<p>${message}</p>`;

  const liste = document.getElementById("liste-ecritures");
  if (liste) liste.innerHTML = html;

  const zones = [
    "zone-detail-ecritures",
    "zone-ouverture",
    "zone-comptes-t",
    "zone-bv",
    "zone-bilan",
    "zone-resultats",
    "zone-cout-fabrication",
    "zone-fiches-fabrication"
  ];

  zones.forEach(id => {
    const zone = document.getElementById(id);
    if (zone) zone.innerHTML = html;
  });
}

// ============================================================
// BALANCE DE VÉRIFICATION
// ============================================================

function construireBalanceVerification(exercice, comptesParID, ecrituresCochees) {
  const bv = {};

  function ajouterLigne(ligne) {
    const compteID = Number(ligne.CompteID);
    const compte = comptesParID[compteID];

    if (!bv[compteID]) {
      bv[compteID] = {
        CompteID: compteID,
        Compte: compte ? compte.Compte : "Compte inconnu",
        Debit: 0,
        Credit: 0
      };
    }

    bv[compteID].Debit += Number(ligne.Debit);
    bv[compteID].Credit += Number(ligne.Credit);
  }

  (exercice.Ouverture || []).forEach(ajouterLigne);

  (exercice.Ecritures || []).forEach(ecriture => {
    if (ecrituresCochees.includes(ecriture.IDEcriture)) {
      (ecriture.Lignes || []).forEach(ajouterLigne);
    }
  });

  return Object.values(bv)
    .map(ligne => {
      const solde = ligne.Debit - ligne.Credit;

      return {
        CompteID: ligne.CompteID,
        Compte: ligne.Compte,
        Debit: solde > 0 ? solde : 0,
        Credit: solde < 0 ? Math.abs(solde) : 0
      };
    })
    .sort((a, b) => a.CompteID - b.CompteID);
}

function soldeCompte(bv, compteID) {
  const ligne = bv.find(l => Number(l.CompteID) === Number(compteID));
  if (!ligne) return 0;
  return Number(ligne.Debit) - Number(ligne.Credit);
}

// ============================================================
// FORMATAGE
// ============================================================

function formatMontant2(montant) {
  return Number(montant).toLocaleString("fr-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatMontant0(montant) {
  const montantArrondi = Math.round(Number(montant));
  const montantAbsolu = Math.abs(montantArrondi).toLocaleString("fr-CA", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  return montantArrondi < 0 ? `(${montantAbsolu})` : montantAbsolu;
}

function formatPourcentageDecimal(taux) {
  return `${formatMontant0(Number(taux) * 100)} %`;
}

// ============================================================
// CALCULS ANALYTIQUES — RÉPARTITEUR
// ============================================================

function calculerMontantsSelonTypeExercice(bv, ecrituresCochees) {
  const typeExercice = obtenirTypeExercice();

  if (typeExercice === "fabrication-continue") {
    return calculerMontantsFabricationContinue(bv, ecrituresCochees);
  }

  if (typeExercice === "prix-revient-commande") {
    return calculerMontantsPrixRevientCommande(bv);
  }

  return calculsVides();
}

function calculsVides() {
  return {
    spcDebut: 0,
    mpDirectesUtilisees: 0,
    mainOeuvreDirecte: 0,
    fgfImputesHistoriques: 0,
    fgfReelsHistoriques: 0,
    soldeFGFImputes: 0,
    soldeFGFReels: 0,
    coutsAjoutes: 0,
    coutTotalEnFabrication: 0,
    spcFin: 0,
    cpft: 0,
    ecartImputation: 0,
    ssiComptabilisee: 0,
    fgfFermes: false,
    ventes: 0,
    coutProduitsVendus: 0,
    totalCoutProduitsVendusER: 0,
    fraisVente: 0,
    fraisAdministration: 0,
    totalFraisExploitation: 0,
    resultatNetEtatResultats: 0,
    resultatNetPourBilan: 0
  };
}

// ============================================================
// CALCULS ANALYTIQUES — FABRICATION CONTINUE (chapitre 5)
// ============================================================

function calculerMontantsFabricationContinue(bv, ecrituresCochees) {
  let mpDirectesUtilisees = 0;
  let mainOeuvreDirecte = 0;
  let fgfImputesHistoriques = 0;
  let fgfReelsHistoriques = 0;
  let cpft = 0;
  let fgfFermes = false;

  const spcDebut = (exerciceData.Ouverture || [])
    .filter(l => Number(l.CompteID) === 1181)
    .reduce((s, l) => s + Number(l.Debit) - Number(l.Credit), 0);

  const spcFin = soldeCompte(bv, 1181);

  (exerciceData.Ecritures || []).forEach(ecriture => {
    const lignes = ecriture.Lignes || [];
    const estCochee = ecrituresCochees.includes(ecriture.IDEcriture);
    if (!estCochee) return;

    const debit1181 = lignes.find(l => Number(l.CompteID) === 1181 && Number(l.Debit) > 0);
    const credit1180 = lignes.find(l => Number(l.CompteID) === 1180 && Number(l.Credit) > 0);
    const credit2350 = lignes.find(l => Number(l.CompteID) === 2350 && Number(l.Credit) > 0);
    const credit9640 = lignes.find(l => Number(l.CompteID) === 9640 && Number(l.Credit) > 0);
    const debit9645 = lignes.find(l => Number(l.CompteID) === 9645 && Number(l.Debit) > 0);
    const debit1182 = lignes.find(l => Number(l.CompteID) === 1182 && Number(l.Debit) > 0);

    if (debit1181 && credit1180) mpDirectesUtilisees += Number(debit1181.Debit);
    if (debit1181 && credit2350) mainOeuvreDirecte += Number(debit1181.Debit);
    if (credit9640) fgfImputesHistoriques += Number(credit9640.Credit);
    if (debit9645) fgfReelsHistoriques += Number(debit9645.Debit);
    if (debit1182) cpft += Number(debit1182.Debit);

    const contient1183 = lignes.some(l => Number(l.CompteID) === 1183);
    if (contient1183) {
      fgfFermes = true;
    }
  });

  const coutsAjoutes = mpDirectesUtilisees + mainOeuvreDirecte + fgfImputesHistoriques;
  const coutTotalEnFabrication = spcDebut + coutsAjoutes;
  const ecartImputation = fgfReelsHistoriques - fgfImputesHistoriques;

  const soldeFGFImputes = soldeCompte(bv, 9640);
  const soldeFGFReels = soldeCompte(bv, 9645);
  const ssiComptabilisee = soldeCompte(bv, 1183);

  // Avant fermeture : 9640/9645 flottent hors bilan.
  // On les présente à l'état des résultats pour équilibrer le bilan.
  const fgfReelsER   = fgfFermes ? 0 : Math.max(0, soldeFGFReels);
  const fgfImputesER = fgfFermes ? 0 : Math.abs(Math.min(0, soldeFGFImputes));
  const ecartER      = fgfImputesER - fgfReelsER; // + = sur-imputation, - = sous-imputation

  const ventes = Math.abs(soldeCompte(bv, 4500));
  const coutProduitsVendus = soldeCompte(bv, 5000);

  const totalCoutProduitsVendusER = coutProduitsVendus;
  const resultatNetEtatResultats = ventes - totalCoutProduitsVendusER + ecartER;
  const resultatNetPourBilan = resultatNetEtatResultats;

  return {
    spcDebut,
    mpDirectesUtilisees,
    mainOeuvreDirecte,
    fgfImputesHistoriques,
    fgfReelsHistoriques,
    soldeFGFImputes,
    soldeFGFReels,
    coutsAjoutes,
    coutTotalEnFabrication,
    spcFin,
    cpft,
    ecartImputation,
    ssiComptabilisee,
    fgfFermes,
    fgfReelsER,
    fgfImputesER,
    ecartER,
    ventes,
    coutProduitsVendus,
    totalCoutProduitsVendusER,
    fraisVente: 0,
    fraisAdministration: 0,
    totalFraisExploitation: 0,
    resultatNetEtatResultats,
    resultatNetPourBilan
  };
}

// ============================================================
// CALCULS ANALYTIQUES — PRIX DE REVIENT PAR COMMANDE (chapitre 6)
// ============================================================

function calculerMontantsPrixRevientCommande(bv) {
  const ventes = Math.abs(soldeCompte(bv, 4500));
  const coutProduitsVendus = soldeCompte(bv, 5000);

  const fraisVente = soldeCompte(bv, 6100);
  const fraisAdministration = soldeCompte(bv, 6200);

  const soldeFGFImputes = soldeCompte(bv, 9640);
  const soldeFGFReels = soldeCompte(bv, 9645);

  const totalCoutProduitsVendusER = coutProduitsVendus;
  const totalFraisExploitation = fraisVente + fraisAdministration;

  const resultatNetEtatResultats =
    ventes - totalCoutProduitsVendusER - totalFraisExploitation;

  const resultatNetPourBilan = resultatNetEtatResultats;

  return {
    spcDebut: 0,
    mpDirectesUtilisees: 0,
    mainOeuvreDirecte: 0,
    fgfImputesHistoriques: 0,
    fgfReelsHistoriques: 0,
    soldeFGFImputes,
    soldeFGFReels,
    coutsAjoutes: 0,
    coutTotalEnFabrication: 0,
    spcFin: soldeCompte(bv, 1181),
    cpft: 0,
    ecartImputation: 0,
    ssiComptabilisee: soldeCompte(bv, 1183),
    fgfFermes: true,
    ventes,
    coutProduitsVendus,
    totalCoutProduitsVendusER,
    fraisVente,
    fraisAdministration,
    totalFraisExploitation,
    resultatNetEtatResultats,
    resultatNetPourBilan
  };
}

// ============================================================
// AFFICHAGE — DÉTAIL DES ÉCRITURES
// ============================================================

function afficherDetailEcritures(ecrituresCochees) {
  const zone = document.getElementById("zone-detail-ecritures");
  if (!zone) return;

  if (ecrituresCochees.length === 0) {
    zone.innerHTML = "<p>Aucune écriture cochée.</p>";
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>Écriture</th>
          <th>Date</th>
          <th>Compte</th>
          <th>Débit</th>
          <th>Crédit</th>
        </tr>
      </thead>
      <tbody>
  `;

  ecrituresCochees.forEach(id => {
    const ecriture = ecrituresParID[id];
    if (!ecriture) return;

    (ecriture.Lignes || []).forEach((ligne, index) => {
      const compte = comptesParID[ligne.CompteID];
      const debit = Number(ligne.Debit);
      const credit = Number(ligne.Credit);
      const nomCompte = compte ? compte.Compte : ligne.CompteID;
      const retraitCredit = credit > 0 ? "padding-left: 40px;" : "";

      html += `
        <tr>
          <td>${index === 0 ? ecriture.IDEcriture : ""}</td>
          <td>${index === 0 ? ecriture.Date : ""}</td>
          <td style="${retraitCredit}">${nomCompte}</td>
          <td style="text-align:right">${debit === 0 ? "" : formatMontant0(debit)}</td>
          <td style="text-align:right">${credit === 0 ? "" : formatMontant0(credit)}</td>
        </tr>
      `;
    });

    html += `
      <tr>
        <td></td>
        <td></td>
        <td style="text-align:left"><em>(${ecriture.Libelle})</em></td>
        <td></td>
        <td></td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  zone.innerHTML = html;
}

// ============================================================
// AFFICHAGE — SOLDES D'OUVERTURE
// ============================================================

function afficherSoldesOuverture() {
  const zone = document.getElementById("zone-ouverture");
  if (!zone) return;

  const ouverture = exerciceData.Ouverture || [];

  if (ouverture.length === 0) {
    zone.innerHTML = "<p>Aucun solde d'ouverture.</p>";
    return;
  }

  let totalDebit = 0;
  let totalCredit = 0;

  let html = `
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>CompteID</th>
          <th>Compte</th>
          <th>Débit</th>
          <th>Crédit</th>
        </tr>
      </thead>
      <tbody>
  `;

  ouverture.forEach(ligne => {
    const compte = obtenirCompte(ligne.CompteID);
    const nomCompte = compte ? compte.Compte : "Compte inconnu";
    const debit = Number(ligne.Debit);
    const credit = Number(ligne.Credit);

    totalDebit += debit;
    totalCredit += credit;

    html += `
      <tr>
        <td>${ligne.Date}</td>
        <td>${ligne.CompteID}</td>
        <td>${nomCompte}</td>
        <td style="text-align:right">${formatMontant2(debit)}</td>
        <td style="text-align:right">${formatMontant2(credit)}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
      <tfoot>
        <tr>
          <th colspan="3">Total</th>
          <th style="text-align:right">${formatMontant2(totalDebit)}</th>
          <th style="text-align:right">${formatMontant2(totalCredit)}</th>
        </tr>
      </tfoot>
    </table>
  `;

  zone.innerHTML = html;
}

// ============================================================
// AFFICHAGE — COMPTES EN T
// ============================================================

function construireMouvementsCompteT(compteID, ecrituresCochees) {
  const mouvements = [];

  (exerciceData.Ouverture || []).forEach(ligne => {
    if (Number(ligne.CompteID) !== Number(compteID)) return;

    mouvements.push({
      Date: ligne.Date,
      Reference: "OUV",
      Libelle: "Solde d'ouverture",
      Debit: Number(ligne.Debit),
      Credit: Number(ligne.Credit)
    });
  });

  (exerciceData.Ecritures || []).forEach(ecriture => {
    if (!ecrituresCochees.includes(ecriture.IDEcriture)) return;

    (ecriture.Lignes || []).forEach(ligne => {
      if (Number(ligne.CompteID) !== Number(compteID)) return;

      mouvements.push({
        Date: ecriture.Date,
        Reference: ecriture.IDEcriture,
        Libelle: ecriture.Libelle,
        Debit: Number(ligne.Debit),
        Credit: Number(ligne.Credit)
      });
    });
  });

  return mouvements;
}

function afficherComptesT(ecrituresCochees) {
  const zone = document.getElementById("zone-comptes-t");
  if (!zone) return;

  const compteIDs = obtenirCompteIDsComptesT();

  if (compteIDs.length === 0) {
    zone.innerHTML = "<p>Aucun compte à afficher.</p>";
    return;
  }

  let html = "";

  compteIDs.forEach(compteID => {
    const compte = obtenirCompte(compteID);
    const nomCompte = compte ? compte.Compte : "Compte inconnu";
    const mouvements = construireMouvementsCompteT(compteID, ecrituresCochees);

    if (mouvements.length === 0) return;

    const totalDebit = mouvements.reduce((s, m) => s + Number(m.Debit), 0);
    const totalCredit = mouvements.reduce((s, m) => s + Number(m.Credit), 0);
    const soldeFinal = totalDebit - totalCredit;

    html += `
      <div class="compte-t">
        <h3>${compteID} — ${nomCompte}</h3>

        <table class="table-compte-t">
          <thead>
            <tr>
              <th>Date</th>
              <th>Référence</th>
              <th>Libellé</th>
              <th>Débit</th>
              <th>Crédit</th>
            </tr>
          </thead>
          <tbody>
    `;

    mouvements.forEach(mouvement => {
      html += `
        <tr>
          <td>${mouvement.Date}</td>
          <td>${mouvement.Reference}</td>
          <td>${mouvement.Libelle}</td>
          <td style="text-align:right">${mouvement.Debit === 0 ? "" : formatMontant2(mouvement.Debit)}</td>
          <td style="text-align:right">${mouvement.Credit === 0 ? "" : formatMontant2(mouvement.Credit)}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
          <tfoot>
            <tr>
              <th colspan="3">Totaux</th>
              <th style="text-align:right">${formatMontant2(totalDebit)}</th>
              <th style="text-align:right">${formatMontant2(totalCredit)}</th>
            </tr>
            <tr>
              <th colspan="3">Solde final</th>
              <th style="text-align:right">${soldeFinal >= 0 ? formatMontant2(soldeFinal) : ""}</th>
              <th style="text-align:right">${soldeFinal < 0 ? formatMontant2(Math.abs(soldeFinal)) : ""}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  });

  zone.innerHTML = html || "<p>Aucun mouvement à afficher.</p>";
}

// ============================================================
// AFFICHAGE — BALANCE DE VÉRIFICATION
// ============================================================

function afficherBalanceVerification(bv) {
  const zone = document.getElementById("zone-bv");
  if (!zone) return;

  let totalDebit = 0;
  let totalCredit = 0;

  let html = `
    <table>
      <thead>
        <tr>
          <th>CompteID</th>
          <th>Compte</th>
          <th>Débit</th>
          <th>Crédit</th>
        </tr>
      </thead>
      <tbody>
  `;

  bv.forEach(ligne => {
    totalDebit += Number(ligne.Debit);
    totalCredit += Number(ligne.Credit);

    html += `
      <tr>
        <td>${ligne.CompteID}</td>
        <td>${ligne.Compte}</td>
        <td style="text-align:right">${formatMontant2(ligne.Debit)}</td>
        <td style="text-align:right">${formatMontant2(ligne.Credit)}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
      <tfoot>
        <tr>
          <th colspan="2">Total</th>
          <th style="text-align:right">${formatMontant2(totalDebit)}</th>
          <th style="text-align:right">${formatMontant2(totalCredit)}</th>
        </tr>
      </tfoot>
    </table>
  `;

  zone.innerHTML = html;
}

// ============================================================
// AFFICHAGE — BILAN
// ============================================================

function afficherBilan(bv, calculs) {
  const zone = document.getElementById("zone-bilan");
  if (!zone) return;

  const lignesBilan = bv
    .map(ligne => {
      const compte = comptesParID[ligne.CompteID];
      if (!compte || Number(ligne.CompteID) === 3476) return null;
      if (compte.Etat !== "Bilan") return null;

      const soldeNet = Number(ligne.Debit) - Number(ligne.Credit);

      return {
        Compte: ligne.Compte,
        Section: compte.Section,
        OrdreID: compte.OrdreID,
        Montant: soldeNet * Number(compte.Signe)
      };
    })
    .filter(ligne => ligne !== null && ligne.Montant !== 0);

  if (calculs.resultatNetPourBilan !== 0) {
    lignesBilan.push({
      Compte: "Bénéfices de l'exercice",
      Section: "Capitaux propres",
      OrdreID: "10303476",
      Montant: calculs.resultatNetPourBilan
    });
  }

  lignesBilan.sort((a, b) => String(a.OrdreID).localeCompare(String(b.OrdreID)));

  const actifs = lignesBilan.filter(ligne => ligne.Section === "Actif");
  const passifs = lignesBilan.filter(ligne => ligne.Section === "Passif");
  const capitaux = lignesBilan.filter(ligne => ligne.Section === "Capitaux propres");

  const totalActif = actifs.reduce((s, ligne) => s + Number(ligne.Montant), 0);
  const totalPassif = passifs.reduce((s, ligne) => s + Number(ligne.Montant), 0);
  const totalCapitaux = capitaux.reduce((s, ligne) => s + Number(ligne.Montant), 0);
  const totalPassifCapitaux = totalPassif + totalCapitaux;

  function construireTableSection(titre, lignes, totalTitre, total) {
    let html = `
      <table>
        <tbody>
          <tr>
            <th colspan="2" style="text-align:left">${titre}</th>
          </tr>
    `;

    lignes.forEach(ligne => {
      html += `
        <tr>
          <td>${ligne.Compte}</td>
          <td style="text-align:right">${formatMontant0(ligne.Montant)}</td>
        </tr>
      `;
    });

    html += `
          <tr>
            <th style="text-align:left">${totalTitre}</th>
            <th style="text-align:right">${formatMontant0(total)}</th>
          </tr>
        </tbody>
      </table>
    `;

    return html;
  }

  zone.innerHTML = `
    <div class="bilan-deux-colonnes">
      <div>
        ${construireTableSection("Actif", actifs, "Total actif", totalActif)}
      </div>

      <div>
        ${construireTableSection("Passif", passifs, "Total passif", totalPassif)}
        ${construireTableSection("Capitaux propres", capitaux, "Total capitaux propres", totalCapitaux)}

        <table>
          <tbody>
            <tr>
              <th style="text-align:left">Total passif + capitaux propres</th>
              <th style="text-align:right">${formatMontant0(totalPassifCapitaux)}</th>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

// ============================================================
// AFFICHAGE — ÉTAT DES RÉSULTATS
// ============================================================

function afficherEtatResultats(calculs) {
  const zone = document.getElementById("zone-resultats");
  if (!zone) return;

  const fraisVente = Number(calculs.fraisVente || 0);
  const fraisAdministration = Number(calculs.fraisAdministration || 0);
  const totalFraisExploitation = Number(calculs.totalFraisExploitation || 0);

  // Section FGF avant fermeture des SSI
  const sectionFGF = (!calculs.fgfFermes && (calculs.fgfReelsER !== 0 || calculs.fgfImputesER !== 0))
    ? `
        <tr><th colspan="2" style="text-align:left">Écart d'imputation FGF (avant fermeture des SSI)</th></tr>
        <tr>
          <td>FGF réels (charge)</td>
          <td style="text-align:right">${formatMontant0(calculs.fgfReelsER)}</td>
        </tr>
        <tr>
          <td>FGF imputés (crédit)</td>
          <td style="text-align:right">${formatMontant0(-calculs.fgfImputesER)}</td>
        </tr>
        <tr>
          <th style="text-align:left">Sous/sur-imputation nette</th>
          <th style="text-align:right">${formatMontant0(-calculs.ecartER)}</th>
        </tr>`
    : '';

  let html = `
    <table>
      <tbody>
        <tr><th colspan="2" style="text-align:left">Revenus</th></tr>
        <tr>
          <td>Ventes</td>
          <td style="text-align:right">${formatMontant0(calculs.ventes)}</td>
        </tr>
        <tr>
          <th style="text-align:left">Total revenus</th>
          <th style="text-align:right">${formatMontant0(calculs.ventes)}</th>
        </tr>

        <tr><th colspan="2" style="text-align:left">Coût des produits vendus</th></tr>
        <tr>
          <td>Coût des produits vendus</td>
          <td style="text-align:right">${formatMontant0(calculs.coutProduitsVendus)}</td>
        </tr>

        <tr>
          <th style="text-align:left">Total coût des produits vendus</th>
          <th style="text-align:right">${formatMontant0(calculs.totalCoutProduitsVendusER)}</th>
        </tr>

        ${sectionFGF}

        <tr><th colspan="2" style="text-align:left">Frais d'exploitation</th></tr>
        <tr>
          <td>Frais de vente</td>
          <td style="text-align:right">${formatMontant0(fraisVente)}</td>
        </tr>
        <tr>
          <td>Frais d'administration</td>
          <td style="text-align:right">${formatMontant0(fraisAdministration)}</td>
        </tr>
        <tr>
          <th style="text-align:left">Total frais d'exploitation</th>
          <th style="text-align:right">${formatMontant0(totalFraisExploitation)}</th>
        </tr>

        <tr>
          <th style="text-align:left">Résultat net</th>
          <th style="text-align:right">${formatMontant0(calculs.resultatNetEtatResultats)}</th>
        </tr>
      </tbody>
    </table>
  `;

  zone.innerHTML = html;
}

// ============================================================
// AFFICHAGE — ÉTAT DU COÛT DE FABRICATION
// ============================================================

function afficherEtatCoutFabrication(calculs) {
  const zone = document.getElementById("zone-cout-fabrication");
  if (!zone) return;

  const typeExercice = obtenirTypeExercice();
  if (typeExercice !== "fabrication-continue") {
    zone.innerHTML = "<p>Aucun état du coût de fabrication pour cet exercice.</p>";
    return;
  }

  const fgfReelsAffiches = calculs.fgfFermes ? 0 : calculs.fgfReelsHistoriques;
  const fgfImputesAffiches = calculs.fgfFermes ? 0 : calculs.fgfImputesHistoriques;
  const ecartAffiche = calculs.fgfFermes ? 0 : calculs.ecartImputation;

  let html = `
    <table>
      <tbody>
        <tr><th colspan="2" style="text-align:left">Stocks de produits en cours</th></tr>
        <tr>
          <td>SPC au début</td>
          <td style="text-align:right">${formatMontant0(calculs.spcDebut)}</td>
        </tr>

        <tr><th colspan="2" style="text-align:left">Coûts de fabrication ajoutés</th></tr>
        <tr>
          <td>MP directes utilisées</td>
          <td style="text-align:right">${formatMontant0(calculs.mpDirectesUtilisees)}</td>
        </tr>
        <tr>
          <td>Main-d'œuvre directe</td>
          <td style="text-align:right">${formatMontant0(calculs.mainOeuvreDirecte)}</td>
        </tr>
        <tr>
          <td>FGF imputés</td>
          <td style="text-align:right">${formatMontant0(calculs.fgfImputesHistoriques)}</td>
        </tr>
        <tr>
          <th style="text-align:left">Total coûts de fabrication ajoutés</th>
          <th style="text-align:right">${formatMontant0(calculs.coutsAjoutes)}</th>
        </tr>

        <tr>
          <th style="text-align:left">Coût total en fabrication</th>
          <th style="text-align:right">${formatMontant0(calculs.coutTotalEnFabrication)}</th>
        </tr>
        <tr>
          <td>Moins : SPC à la fin</td>
          <td style="text-align:right">${formatMontant0(calculs.spcFin)}</td>
        </tr>
        <tr>
          <th style="text-align:left">Coût des produits fabriqués et transférés</th>
          <th style="text-align:right">${formatMontant0(calculs.cpft)}</th>
        </tr>

        <tr><th colspan="2" style="text-align:left">Analyse des FGF</th></tr>
        <tr>
          <td>FGF réels</td>
          <td style="text-align:right">${formatMontant0(fgfReelsAffiches)}</td>
        </tr>
        <tr>
          <td>FGF imputés</td>
          <td style="text-align:right">${formatMontant0(fgfImputesAffiches)}</td>
        </tr>
        <tr>
          <td>Écart d'imputation</td>
          <td style="text-align:right">${formatMontant0(ecartAffiche)}</td>
        </tr>
        <tr>
          <th style="text-align:left">Solde SSI</th>
          <th style="text-align:right">${formatMontant0(calculs.ssiComptabilisee)}</th>
        </tr>
      </tbody>
    </table>
  `;

  zone.innerHTML = html;
}

// ============================================================
// AFFICHAGE — FICHES DE FABRICATION (chapitre 6)
// ============================================================

function determinerNatureEcritureCommande(ecriture) {
  const lignes = ecriture.Lignes || [];

  if (lignes.some(l => Number(l.CompteID) === 1180 && Number(l.Credit) > 0)) return "mp";
  if (lignes.some(l => Number(l.CompteID) === 2350 && Number(l.Credit) > 0)) return "mod";
  if (lignes.some(l => Number(l.CompteID) === 9640 && Number(l.Credit) > 0)) return "fgf";

  return null;
}

function construireMatriceFiches(ecrituresCochees) {
  const commandes = exerciceData?.Commandes || [];
  const ateliersConfig = obtenirAteliersExercice();
  const utiliserAteliers = Array.isArray(ateliersConfig) && ateliersConfig.length > 0;

  const matrice = {};

  commandes.forEach(commande => {
    const commandeID = String(commande.CommandeID);

    matrice[commandeID] = {
      commandeID,
      libelle: commande.Libelle || `Commande ${commandeID}`,
      prixVente: Number(commande.PrixVente || 0),
      statut: commande.Statut || "",
      utiliserAteliers,
      ateliers: {},
      direct: {
        mp: 0,
        mod: 0,
        fgf: 0
      },
      ouverture: {
        mp: 0,
        mod: 0,
        fgf: 0
      },
      sommaire: {
        ouverture: 0,
        mp: 0,
        mod: 0,
        fgf: 0,
        coutTotal: 0,
        mbb: 0
      }
    };

    if (utiliserAteliers) {
      ateliersConfig.forEach(atelier => {
        matrice[commandeID].ateliers[atelier.AtelierID] = {
          AtelierID: atelier.AtelierID,
          Libelle: atelier.Libelle,
          tauxImputation: Number(atelier.TauxImputation || 0),
          mp: 0,
          mod: 0,
          fgf: 0,
          total: 0
        };
      });
    }
  });

  (exerciceData.Ouverture || []).forEach(ligne => {
    if (!ligne.CommandeID) return;
    if (Number(ligne.CompteID) !== 1181) return;

    const commandeID = String(ligne.CommandeID);
    if (!matrice[commandeID]) return;

    const nature = String(ligne.Nature || "").trim().toLowerCase();
    const montant = Number(ligne.Debit) - Number(ligne.Credit);

    if (["mp", "mod", "fgf"].includes(nature)) {
      matrice[commandeID].ouverture[nature] += montant;
    } else {
      matrice[commandeID].sommaire.ouverture += montant;
    }
  });

  (exerciceData.Ecritures || []).forEach(ecriture => {
    if (!ecrituresCochees.includes(ecriture.IDEcriture)) return;

    const nature = determinerNatureEcritureCommande(ecriture);
    if (!nature) return;

    (ecriture.Lignes || []).forEach(ligne => {
      if (Number(ligne.CompteID) !== 1181) return;
      if (Number(ligne.Debit) <= 0) return;
      if (!ligne.CommandeID) return;

      const commandeID = String(ligne.CommandeID);
      if (!matrice[commandeID]) return;

      const montant = Number(ligne.Debit);

      if (utiliserAteliers) {
        const atelierID = ligne.AtelierID;
        if (!atelierID) return;
        if (!matrice[commandeID].ateliers[atelierID]) return;

        matrice[commandeID].ateliers[atelierID][nature] += montant;
      } else {
        matrice[commandeID].direct[nature] += montant;
      }
    });
  });

  Object.values(matrice).forEach(fiche => {
    const ouvertureTotale =
      fiche.ouverture.mp + fiche.ouverture.mod + fiche.ouverture.fgf;

    if (fiche.utiliserAteliers) {
      Object.values(fiche.ateliers).forEach(atelier => {
        atelier.total = atelier.mp + atelier.mod + atelier.fgf;
        fiche.sommaire.mp += atelier.mp;
        fiche.sommaire.mod += atelier.mod;
        fiche.sommaire.fgf += atelier.fgf;
      });
    } else {
      fiche.sommaire.mp = fiche.direct.mp;
      fiche.sommaire.mod = fiche.direct.mod;
      fiche.sommaire.fgf = fiche.direct.fgf;
    }

    fiche.sommaire.ouverture += ouvertureTotale;

    fiche.sommaire.coutTotal =
      fiche.sommaire.ouverture +
      fiche.sommaire.mp +
      fiche.sommaire.mod +
      fiche.sommaire.fgf;

    fiche.sommaire.mbb = fiche.prixVente - fiche.sommaire.coutTotal;
  });

  return matrice;
}

function formatMontantFiche(montant) {
  return Number(montant) === 0 ? "—" : formatMontant0(montant);
}

function normaliserStatutCommande(statut) {
  return String(statut || "").trim().toLowerCase();
}

function libelleStatutCommande(statut) {
  const s = normaliserStatutCommande(statut);

  if (s === "vendue") return "commande vendue";
  if (s === "terminee") return "commande terminée";
  if (s === "en-cours") return "commande en cours";
  if (s === "partielle") return "commande partielle";

  return "statut non précisé";
}

function trouverEcritureCommandeParNature(commandeID, nature, ecrituresCochees) {
  return (exerciceData.Ecritures || []).find(ecriture => {
    if (!ecrituresCochees.includes(ecriture.IDEcriture)) return false;
    if (determinerNatureEcritureCommande(ecriture) !== nature) return false;

    return (ecriture.Lignes || []).some(ligne =>
      Number(ligne.CompteID) === 1181 &&
      Number(ligne.Debit) > 0 &&
      String(ligne.CommandeID || "") === String(commandeID)
    );
  }) || null;
}

function construireExplicationsFicheHTML(fiche, ecrituresCochees) {
  const ateliersConfig = obtenirAteliersExercice();

  const ecritureMP = trouverEcritureCommandeParNature(fiche.commandeID, "mp", ecrituresCochees);
  const ecritureMOD = trouverEcritureCommandeParNature(fiche.commandeID, "mod", ecrituresCochees);
  const ecritureFGF = trouverEcritureCommandeParNature(fiche.commandeID, "fgf", ecrituresCochees);

  let html = `<div class="fiche-explications"><h4>Explications</h4>`;

  if (fiche.sommaire.ouverture !== 0) {
    html += `
      <div class="fiche-explication-bloc">
        <p><strong>Ouverture de la commande ${fiche.commandeID}</strong></p>
    `;

    if (fiche.ouverture.mp !== 0) {
      html += `<p>MP d'ouverture = <strong>${formatMontant0(fiche.ouverture.mp)}</strong></p>`;
    }
    if (fiche.ouverture.mod !== 0) {
      html += `<p>MOD d'ouverture = <strong>${formatMontant0(fiche.ouverture.mod)}</strong></p>`;
    }
    if (fiche.ouverture.fgf !== 0) {
      html += `<p>FGF d'ouverture = <strong>${formatMontant0(fiche.ouverture.fgf)}</strong></p>`;
    }

    html += `<p>Total d'ouverture = <strong>${formatMontant0(fiche.sommaire.ouverture)}</strong></p>`;
    html += `</div>`;
  }

  if (ecritureMP && fiche.sommaire.mp !== 0) {
    html += `
      <div class="fiche-explication-bloc">
        <p><strong>${ecritureMP.IDEcriture} — ${ecritureMP.Libelle}</strong></p>
    `;

    if (fiche.utiliserAteliers) {
      ateliersConfig.forEach(atelier => {
        const a = fiche.ateliers[atelier.AtelierID];
        if (!a || a.mp === 0) return;
        html += `<p>${atelier.Libelle} : MP directes affectées à la commande ${fiche.commandeID} = <strong>${formatMontant0(a.mp)}</strong></p>`;
      });
    } else {
      html += `<p>MP directes affectées à la commande ${fiche.commandeID} = <strong>${formatMontant0(fiche.sommaire.mp)}</strong></p>`;
    }

    html += `</div>`;
  }

  if (ecritureMOD && fiche.sommaire.mod !== 0) {
    html += `
      <div class="fiche-explication-bloc">
        <p><strong>${ecritureMOD.IDEcriture} — ${ecritureMOD.Libelle}</strong></p>
    `;

    if (fiche.utiliserAteliers) {
      ateliersConfig.forEach(atelier => {
        const a = fiche.ateliers[atelier.AtelierID];
        if (!a || a.mod === 0) return;
        html += `<p>${atelier.Libelle} : MOD affectée à la commande ${fiche.commandeID} = <strong>${formatMontant0(a.mod)}</strong></p>`;
      });
    } else {
      html += `<p>MOD affectée à la commande ${fiche.commandeID} = <strong>${formatMontant0(fiche.sommaire.mod)}</strong></p>`;
    }

    html += `</div>`;
  }

  if (ecritureFGF && fiche.sommaire.fgf !== 0) {
    html += `
      <div class="fiche-explication-bloc">
        <p><strong>${ecritureFGF.IDEcriture} — ${ecritureFGF.Libelle}</strong></p>
    `;

    if (fiche.utiliserAteliers) {
      const ateliersUtiles = ateliersConfig.filter(atelier => {
        const a = fiche.ateliers[atelier.AtelierID];
        return a && (a.mod !== 0 || a.fgf !== 0);
      });

      ateliersUtiles.forEach(atelier => {
        html += `<p>Taux ${atelier.AtelierID} : ${formatPourcentageDecimal(atelier.TauxImputation)} de la MOD</p>`;
      });

      html += `<p><strong>FGF imputés à la commande ${fiche.commandeID} :</strong></p>`;

      ateliersUtiles.forEach(atelier => {
        const a = fiche.ateliers[atelier.AtelierID];
        if (!a || a.fgf === 0) return;

        if (a.mod !== 0) {
          html += `<p>${atelier.Libelle} : ${formatMontant0(a.mod)} × ${formatPourcentageDecimal(atelier.TauxImputation)} = <strong>${formatMontant0(a.fgf)}</strong></p>`;
        } else {
          html += `<p>${atelier.Libelle} : <strong>${formatMontant0(a.fgf)}</strong></p>`;
        }
      });
    } else {
      html += `<p>FGF imputés à la commande ${fiche.commandeID} = <strong>${formatMontant0(fiche.sommaire.fgf)}</strong></p>`;
    }

    html += `</div>`;
  }

  html += `
    <div class="fiche-explication-bloc">
      <p><strong>Coût total de la commande</strong></p>
      <p>Ouverture + MP + MOD + FGF imputés = <strong>${formatMontant0(fiche.sommaire.coutTotal)}</strong></p>
    </div>
  `;

  html += `</div>`;
  return html;
}

function construireSommaireFicheHTML(fiche) {
  const statut = normaliserStatutCommande(fiche.statut);

  let rows = "";

  if (fiche.sommaire.ouverture !== 0) {
    if (fiche.ouverture.mp !== 0) {
      rows += `
        <tr>
          <td>Ouverture — MP</td>
          <td class="fiche-montant">${formatMontant0(fiche.ouverture.mp)}</td>
        </tr>
      `;
    }

    if (fiche.ouverture.mod !== 0) {
      rows += `
        <tr>
          <td>Ouverture — MOD</td>
          <td class="fiche-montant">${formatMontant0(fiche.ouverture.mod)}</td>
        </tr>
      `;
    }

    if (fiche.ouverture.fgf !== 0) {
      rows += `
        <tr>
          <td>Ouverture — FGF</td>
          <td class="fiche-montant">${formatMontant0(fiche.ouverture.fgf)}</td>
        </tr>
      `;
    }

    rows += `
      <tr>
        <td>Ouverture — total</td>
        <td class="fiche-montant">${formatMontant0(fiche.sommaire.ouverture)}</td>
      </tr>
    `;
  }

  rows += `
    <tr>
      <td>MP</td>
      <td class="fiche-montant">${formatMontant0(fiche.sommaire.mp)}</td>
    </tr>
    <tr>
      <td>MOD</td>
      <td class="fiche-montant">${formatMontant0(fiche.sommaire.mod)}</td>
    </tr>
    <tr>
      <td>FGF imputés</td>
      <td class="fiche-montant">${formatMontant0(fiche.sommaire.fgf)}</td>
    </tr>
    <tr>
      <td>Coût total</td>
      <td class="fiche-montant">${formatMontant0(fiche.sommaire.coutTotal)}</td>
    </tr>
  `;

  if (statut === "vendue") {
    rows =
      `
      <tr>
        <td>Prix de vente</td>
        <td class="fiche-montant">${formatMontant0(fiche.prixVente)}</td>
      </tr>
      ` + rows +
      `
      <tr>
        <td>MBB</td>
        <td class="fiche-montant">${formatMontant0(fiche.sommaire.mbb)}</td>
      </tr>
      `;
  }

  return `
    <table class="table-fiche-sommaire">
      <thead>
        <tr>
          <th colspan="2">Sommaire</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function afficherFichesFabrication(ecrituresCochees) {
  const zone = document.getElementById("zone-fiches-fabrication");
  if (!zone) return;

  const typeExercice = obtenirTypeExercice();
  if (typeExercice !== "prix-revient-commande") {
    zone.innerHTML = "<p>Aucune fiche de fabrication pour cet exercice.</p>";
    return;
  }

  const commandes = exerciceData?.Commandes || [];
  const ateliers = obtenirAteliersExercice();

  if (commandes.length === 0) {
    zone.innerHTML = "<p>Données insuffisantes pour afficher les fiches de fabrication.</p>";
    return;
  }

  const matrice = construireMatriceFiches(ecrituresCochees);

  let html = "";

  commandes.forEach(commande => {
    const commandeID = String(commande.CommandeID);
    const fiche = matrice[commandeID];
    if (!fiche) return;

    html += `
      <section class="fiche-fabrication">
        <h3 class="fiche-titre">Fiche de fabrication</h3>
        <p class="fiche-commande">Numéro de commande : <strong>#${commandeID}</strong></p>
    `;

    if (fiche.utiliserAteliers) {
      let theadTop = `<tr><th rowspan="2" class="fiche-col-total"></th>`;
      ateliers.forEach(atelier => {
        theadTop += `<th colspan="3">${atelier.Libelle}</th>`;
      });
      theadTop += `</tr>`;

      let theadBottom = `<tr>`;
      ateliers.forEach(() => {
        theadBottom += `<th>MP</th><th>MOD</th><th>FGF imputés</th>`;
      });
      theadBottom += `</tr>`;

      let rowDetails = `<tr><th class="fiche-ligne-label">Coûts</th>`;
      ateliers.forEach(atelier => {
        const a = fiche.ateliers[atelier.AtelierID];
        rowDetails += `
          <td class="fiche-montant">${formatMontantFiche(a.mp)}</td>
          <td class="fiche-montant">${formatMontantFiche(a.mod)}</td>
          <td class="fiche-montant">${formatMontantFiche(a.fgf)}</td>
        `;
      });
      rowDetails += `</tr>`;

      let rowTotals = `<tr><th class="fiche-ligne-label">Total</th>`;
      ateliers.forEach(atelier => {
        const a = fiche.ateliers[atelier.AtelierID];
        rowTotals += `
          <td colspan="3" class="fiche-total-atelier">${formatMontant0(a.total)}</td>
        `;
      });
      rowTotals += `</tr>`;

      html += `
        <table class="table-fiche-fabrication">
          <thead>
            ${theadTop}
            ${theadBottom}
          </thead>
          <tbody>
            ${rowDetails}
            ${rowTotals}
          </tbody>
        </table>
      `;
    } else {
      const totalMP = fiche.ouverture.mp + fiche.direct.mp;
      const totalMOD = fiche.ouverture.mod + fiche.direct.mod;
      const totalFGF = fiche.ouverture.fgf + fiche.direct.fgf;

      html += `
        <table class="table-fiche-fabrication">
          <thead>
            <tr>
              <th></th>
              <th>MP</th>
              <th>MOD</th>
              <th>FGF imputés</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th class="fiche-ligne-label">Ouverture</th>
              <td class="fiche-montant">${formatMontantFiche(fiche.ouverture.mp)}</td>
              <td class="fiche-montant">${formatMontantFiche(fiche.ouverture.mod)}</td>
              <td class="fiche-montant">${formatMontantFiche(fiche.ouverture.fgf)}</td>
            </tr>
            <tr>
              <th class="fiche-ligne-label">Période</th>
              <td class="fiche-montant">${formatMontantFiche(fiche.direct.mp)}</td>
              <td class="fiche-montant">${formatMontantFiche(fiche.direct.mod)}</td>
              <td class="fiche-montant">${formatMontantFiche(fiche.direct.fgf)}</td>
            </tr>
            <tr>
              <th class="fiche-ligne-label">Total</th>
              <td class="fiche-montant">${formatMontantFiche(totalMP)}</td>
              <td class="fiche-montant">${formatMontantFiche(totalMOD)}</td>
              <td class="fiche-montant">${formatMontantFiche(totalFGF)}</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    html += `
      <p class="fiche-statut">
        ${libelleStatutCommande(fiche.statut)} — coût total : <strong>${formatMontant0(fiche.sommaire.coutTotal)}</strong>
      </p>

      <div class="fiche-bas">
        ${construireSommaireFicheHTML(fiche)}
        ${construireExplicationsFicheHTML(fiche, ecrituresCochees)}
      </div>
    </section>
    `;
  });

  zone.innerHTML = html || "<p>Aucune fiche de fabrication à afficher.</p>";
}

// ============================================================
// DÉMARRAGE
// ============================================================

chargerJSON();