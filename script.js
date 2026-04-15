let planComptable = [];
let exerciceData = {};
let comptesParID = {};
let ecrituresParID = {};

async function chargerJSON() {
  planComptable = await fetch("planctb.json").then(r => r.json());

  construireComptesParID();
  initialiserBoutonsSelection();
  initialiserBoutonsVues();
  initialiserChoixExercice();

  await chargerExercice();
  afficherVue("detail");
}

async function chargerExercice() {
  const selecteur = document.getElementById("choix-exercice");
  const fichierExercice = selecteur.value;

  exerciceData = await fetch(fichierExercice).then(r => r.json());

  construireEcrituresParID();
  afficherListeEcritures();
  decocherToutesLesEcritures();
  mettreAJour();
}

function initialiserChoixExercice() {
  const selecteur = document.getElementById("choix-exercice");
  if (!selecteur) return;

  selecteur.addEventListener("change", chargerExercice);
}

function construireComptesParID() {
  comptesParID = {};

  planComptable.forEach(compte => {
    comptesParID[compte.CompteID] = compte;
  });
}

function construireEcrituresParID() {
  ecrituresParID = {};

  exerciceData.Ecritures.forEach(ecriture => {
    ecrituresParID[ecriture.IDEcriture] = ecriture;
  });
}

function afficherListeEcritures() {
  const zone = document.getElementById("liste-ecritures");
  zone.innerHTML = "";

  exerciceData.Ecritures.forEach(ecriture => {
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
  document.getElementById("btn-tout-cocher").addEventListener("click", () => {
    document.querySelectorAll("#liste-ecritures input[type='checkbox']").forEach(caseEcriture => {
      caseEcriture.checked = true;
    });

    mettreAJour();
  });

  document.getElementById("btn-tout-decocher").addEventListener("click", () => {
    decocherToutesLesEcritures();
    mettreAJour();
  });
}

function decocherToutesLesEcritures() {
  document.querySelectorAll("#liste-ecritures input[type='checkbox']").forEach(caseEcriture => {
    caseEcriture.checked = false;
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

function calculerSoldeNetLigne(ligne) {
  return Number(ligne.Debit) - Number(ligne.Credit);
}

function obtenirCompteIDsComptesT() {
  const listeManuelle = exerciceData?.Affichage?.ComptesT;

  if (Array.isArray(listeManuelle) && listeManuelle.length > 0) {
    return [...new Set(listeManuelle.map(Number))].sort((a, b) => a - b);
  }

  const ids = new Set();

  (exerciceData.Ouverture || []).forEach(ligne => {
    ids.add(Number(ligne.CompteID));
  });

  (exerciceData.Ecritures || []).forEach(ecriture => {
    (ecriture.Lignes || []).forEach(ligne => {
      ids.add(Number(ligne.CompteID));
    });
  });

  return [...ids].sort((a, b) => a - b);
}

function mettreAJour() {
  const ecrituresCochees = obtenirEcrituresCochees();
  const bv = construireBalanceVerification(exerciceData, comptesParID, ecrituresCochees);
  const calculs = calculerMontantsAnalytiques(bv, ecrituresCochees);

  afficherDetailEcritures(ecrituresCochees);
  afficherSoldesOuverture();
  afficherComptesT();
  afficherBalanceVerification(bv);
  afficherBilan(bv, calculs);
  afficherEtatResultats(calculs);
  afficherEtatCoutFabrication(calculs);
}

function construireBalanceVerification(exercice, comptesParID, ecrituresCochees) {
  const bv = {};

  function ajouterLigne(ligne) {
    const compteID = ligne.CompteID;
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

  exercice.Ouverture.forEach(ajouterLigne);

  exercice.Ecritures.forEach(ecriture => {
    if (ecrituresCochees.includes(ecriture.IDEcriture)) {
      ecriture.Lignes.forEach(ajouterLigne);
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
  const ligne = bv.find(l => l.CompteID === compteID);
  if (!ligne) return 0;
  return ligne.Debit - ligne.Credit;
}

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

function calculerMontantsAnalytiques(bv, ecrituresCochees) {
  let mpDirectesUtilisees = 0;
  let mainOeuvreDirecte = 0;
  let fgfImputesHistoriques = 0;
  let fgfReelsHistoriques = 0;
  let cpft = 0;
  let ecritureAvec5007 = false;

  const spcDebut = exerciceData.Ouverture
    .filter(l => l.CompteID === 1181)
    .reduce((s, l) => s + Number(l.Debit) - Number(l.Credit), 0);

  const spcFin = soldeCompte(bv, 1181);

  exerciceData.Ecritures.forEach(ecriture => {
    if (!ecrituresCochees.includes(ecriture.IDEcriture)) return;

    const debit1181 = ecriture.Lignes.find(l => l.CompteID === 1181 && Number(l.Debit) > 0);
    const credit1180 = ecriture.Lignes.find(l => l.CompteID === 1180 && Number(l.Credit) > 0);
    const credit2350 = ecriture.Lignes.find(l => l.CompteID === 2350 && Number(l.Credit) > 0);
    const credit9640 = ecriture.Lignes.find(l => l.CompteID === 9640 && Number(l.Credit) > 0);
    const debit9645 = ecriture.Lignes.find(l => l.CompteID === 9645 && Number(l.Debit) > 0);
    const debit1182 = ecriture.Lignes.find(l => l.CompteID === 1182 && Number(l.Debit) > 0);
    const credit1181 = ecriture.Lignes.find(l => l.CompteID === 1181 && Number(l.Credit) > 0);

    if (ecriture.Lignes.some(l => l.CompteID === 5007)) {
      ecritureAvec5007 = true;
    }

    if (debit1181 && credit1180) mpDirectesUtilisees += Number(debit1181.Debit);
    if (debit1181 && credit2350) mainOeuvreDirecte += Number(debit1181.Debit);
    if (credit9640) fgfImputesHistoriques += Number(credit9640.Credit);
    if (debit9645) fgfReelsHistoriques += Number(debit9645.Debit);
    if (debit1182 && credit1181) cpft += Number(debit1182.Debit);
  });

  const coutsAjoutes = mpDirectesUtilisees + mainOeuvreDirecte + fgfImputesHistoriques;
  const coutTotalEnFabrication = spcDebut + coutsAjoutes;
  const ecartImputation = fgfReelsHistoriques - fgfImputesHistoriques;

  const soldeFGFImputes = soldeCompte(bv, 9640);
  const soldeFGFReels = soldeCompte(bv, 9645);

  const fgfFermes =
    ecritureAvec5007 ||
    (
      Math.abs(soldeFGFImputes) < 0.005 &&
      Math.abs(soldeFGFReels) < 0.005 &&
      (fgfImputesHistoriques !== 0 || fgfReelsHistoriques !== 0)
    );

  const ssiComptabilisee = soldeCompte(bv, 5007);

  const ventes = Math.abs(soldeCompte(bv, 4500));
  const coutProduitsVendus = soldeCompte(bv, 5000);

  const totalCoutProduitsVendusER = coutProduitsVendus + ssiComptabilisee;
  const resultatNetEtatResultats = ventes - totalCoutProduitsVendusER;

  const resultatNetPourBilan = fgfFermes
    ? resultatNetEtatResultats
    : ventes - coutProduitsVendus - ecartImputation;

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
    ventes,
    coutProduitsVendus,
    totalCoutProduitsVendusER,
    resultatNetEtatResultats,
    resultatNetPourBilan
  };
}

function afficherDetailEcritures(ecrituresCochees) {
  const zone = document.getElementById("zone-detail-ecritures");

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

    ecriture.Lignes.forEach((ligne, index) => {
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

  html += `
      </tbody>
    </table>
  `;

  zone.innerHTML = html;
}

function afficherSoldesOuverture() {
  const zone = document.getElementById("zone-ouverture");
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
function afficherComptesT() {
  const zone = document.getElementById("zone-comptes-t");
  const compteIDs = obtenirCompteIDsComptesT();
  const ecrituresCochees = obtenirEcrituresCochees();

  if (compteIDs.length === 0) {
    zone.innerHTML = "<p>Aucun compte à afficher.</p>";
    return;
  }

  let html = "";

  compteIDs.forEach(compteID => {
    const compte = obtenirCompte(compteID);
    const nomCompte = compte ? compte.Compte : "Compte inconnu";

    const mouvements = construireMouvementsCompteT(compteID, ecrituresCochees);

    if (mouvements.length === 0) {
      return;
    }

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

function afficherBalanceVerification(bv) {
  const zone = document.getElementById("zone-bv");

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
    totalDebit += ligne.Debit;
    totalCredit += ligne.Credit;

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

function afficherBilan(bv, calculs) {
  const zone = document.getElementById("zone-bilan");

  const lignesBilan = bv
    .map(ligne => {
      const compte = comptesParID[ligne.CompteID];
      if (!compte || compte.Etat !== "Bilan" || ligne.CompteID === 3476) return null;

      const soldeNet = ligne.Debit - ligne.Credit;

      return {
        Compte: ligne.Compte,
        Section: compte.Section,
        OrdreID: compte.OrdreID,
        Montant: soldeNet * compte.Signe
      };
    })
    .filter(ligne => ligne !== null && ligne.Montant !== 0);

  if (calculs.resultatNetPourBilan !== 0) {
    lignesBilan.push({
      Compte: calculs.fgfFermes
        ? "Bénéfices de l'exercice"
        : "Bénéfices de l'exercice — provisoire",
      Section: "Capitaux propres",
      OrdreID: "10303476",
      Montant: calculs.resultatNetPourBilan
    });
  }

  lignesBilan.sort((a, b) => String(a.OrdreID).localeCompare(String(b.OrdreID)));

  const actifs = lignesBilan.filter(ligne => ligne.Section === "Actif");
  const passifs = lignesBilan.filter(ligne => ligne.Section === "Passif");
  const capitaux = lignesBilan.filter(ligne => ligne.Section === "Capitaux propres");

  const totalActif = actifs.reduce((s, ligne) => s + ligne.Montant, 0);
  const totalPassif = passifs.reduce((s, ligne) => s + ligne.Montant, 0);
  const totalCapitaux = capitaux.reduce((s, ligne) => s + ligne.Montant, 0);
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

function afficherEtatResultats(calculs) {
  const zone = document.getElementById("zone-resultats");

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
  `;

  if (Math.abs(calculs.ssiComptabilisee) > 0.005) {
    const libelleSSI = calculs.ssiComptabilisee >= 0
      ? "Sous-imputation des FGF"
      : "Sur-imputation des FGF";

    html += `
        <tr>
          <td>${libelleSSI}</td>
          <td style="text-align:right">${formatMontant0(calculs.ssiComptabilisee)}</td>
        </tr>
    `;
  } else if (!calculs.fgfFermes && calculs.ecartImputation !== 0) {
    html += `
        <tr>
          <td>Écart d’imputation non comptabilisé</td>
          <td style="text-align:right">${formatMontant0(calculs.ecartImputation)}</td>
        </tr>
    `;
  }

  html += `
        <tr>
          <th style="text-align:left">Total coût des produits vendus</th>
          <th style="text-align:right">${formatMontant0(calculs.totalCoutProduitsVendusER)}</th>
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

function afficherEtatCoutFabrication(calculs) {
  const zone = document.getElementById("zone-cout-fabrication");

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
          <td>Écart d’imputation</td>
          <td style="text-align:right">${formatMontant0(ecartAffiche)}</td>
        </tr>
        <tr>
          <th style="text-align:left">Solde SSI comptabilisée</th>
          <th style="text-align:right">${formatMontant0(calculs.ssiComptabilisee)}</th>
        </tr>
      </tbody>
    </table>
  `;

  zone.innerHTML = html;
}

chargerJSON();