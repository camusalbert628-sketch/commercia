# -*- coding: utf-8 -*-
"""
COMMERCIA - Guide Pratique & Cas Réel : Maman Beignets-Haricots-Bouillie (BHB)
Génération d'un PDF complet et fidèle au scénario de Maman Chantal.
"""

import sys
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Canvas avec numérotation 'Page X sur Y' et en-tête / pied de page dynamique.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor('#64748B'))

        # Running header sur les pages > 1
        if self._pageNumber > 1:
            self.drawString(1.3 * cm, A4[1] - 0.9 * cm, "COMMERCIA • Cas Réel : Restauration de Rue & Street-Food (Maman Beignets BHB)")
            self.setStrokeColor(colors.HexColor('#E2E8F0'))
            self.setLineWidth(0.5)
            self.line(1.3 * cm, A4[1] - 1.05 * cm, A4[0] - 1.3 * cm, A4[1] - 1.05 * cm)

        # Footer sur toutes les pages
        self.setStrokeColor(colors.HexColor('#E2E8F0'))
        self.setLineWidth(0.5)
        self.line(1.3 * cm, 1.2 * cm, A4[0] - 1.3 * cm, 1.2 * cm)

        footer_text = "COMMERCIA — Le Copilote Financier des Entreprises Africaines • https://commercia-app.vercel.app"
        self.drawString(1.3 * cm, 0.8 * cm, footer_text)

        page_str = f"Page {self._pageNumber} sur {page_count}"
        self.drawRightString(A4[0] - 1.3 * cm, 0.8 * cm, page_str)
        self.restoreState()


def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=1.2 * cm,
        rightMargin=1.2 * cm,
        topMargin=1.2 * cm,
        bottomMargin=1.3 * cm
    )

    styles = getSampleStyleSheet()

    c_navy = colors.HexColor('#0B192C')
    c_blue = colors.HexColor('#0062FF')
    c_orange = colors.HexColor('#FF6B00')
    c_slate = colors.HexColor('#334155')
    c_body = colors.HexColor('#1E293B')

    tagline = ParagraphStyle(
        'Tagline',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=c_blue,
        spaceAfter=2,
        textTransform='uppercase',
    )

    main_title = ParagraphStyle(
        'MainTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18.5,
        textColor=c_navy,
        spaceAfter=3,
    )

    h1_part = ParagraphStyle(
        'H1Part',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=13,
        textColor=colors.HexColor('#FFFFFF'),
        alignment=0,
    )

    h2_style = ParagraphStyle(
        'H2Style',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.2,
        leading=12,
        textColor=c_navy,
        spaceBefore=4,
        spaceAfter=2,
    )

    h3_time = ParagraphStyle(
        'H3Time',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.6,
        leading=11.5,
        textColor=c_orange,
        spaceBefore=3.5,
        spaceAfter=1.5,
    )

    body = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.6,
        textColor=c_body,
        spaceAfter=2,
    )

    bullet = ParagraphStyle(
        'BulletItem',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.6,
        textColor=c_body,
        leftIndent=10,
        firstLineIndent=-8,
        spaceAfter=1.5,
    )

    dialogue_q = ParagraphStyle(
        'DialQ',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.8,
        textColor=c_navy,
        spaceBefore=2.5,
        spaceAfter=1,
    )

    dialogue_a = ParagraphStyle(
        'DialA',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=7.8,
        leading=10.5,
        textColor=colors.HexColor('#0369A1'),
        leftIndent=12,
        spaceAfter=2.5,
    )

    table_hdr = ParagraphStyle(
        'THdr',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor('#FFFFFF'),
    )

    table_cell = ParagraphStyle(
        'TCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.6,
        leading=10.2,
        textColor=c_slate,
    )

    table_cell_bold = ParagraphStyle(
        'TCellB',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.6,
        leading=10.2,
        textColor=c_navy,
    )

    table_cell_green = ParagraphStyle(
        'TCellG',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.8,
        leading=10.5,
        textColor=colors.HexColor('#059669'),
    )

    table_cell_red = ParagraphStyle(
        'TCellR',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.6,
        leading=10.2,
        textColor=colors.HexColor('#DC2626'),
    )

    def part_header(title_text, bg_color='#0B192C'):
        tbl = Table(
            [[Paragraph(f"<b>{title_text}</b>", h1_part)]],
            colWidths=[18.6 * cm]
        )
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(bg_color)),
            ('TOPPADDING', (0, 0), (-1, -1), 4.5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4.5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        return tbl

    def callout_box(title, text, bg_hex='#EFF6FF', border_hex='#93C5FD', title_color='#1E40AF'):
        content = [
            [Paragraph(f"<b>{title}</b>", ParagraphStyle('CbT', fontName='Helvetica-Bold', fontSize=8.4, textColor=colors.HexColor(title_color), spaceAfter=1.5))],
            [Paragraph(text, ParagraphStyle('CbB', fontName='Helvetica', fontSize=7.6, leading=10.4, textColor=c_slate))]
        ]
        t = Table(content, colWidths=[18.6 * cm])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(bg_hex)),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor(border_hex)),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        return t

    story = []

    # =========================================================================
    # PAGE 1 : DU RÉVEIL À 04H30 JUSQU'AU RUSH DES VENTES DU MATIN
    # =========================================================================
    story.append(Paragraph("COMMERCIA • CAS CONCRETS & MÉTIERS DU QUOTIDIEN", tagline))
    story.append(Paragraph("La Gestion Réelle d'une Table de Beignets-Haricots-Bouillie (BHB)", main_title))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_blue, spaceAfter=5))

    story.append(part_header("PROFIL & MATINÉE : DU MARCHÉ DE GROS À L'OUVERTURE DE CAISSE", '#0B192C'))
    story.append(Spacer(1, 3))

    story.append(Paragraph(
        "<b>Commerçante :</b> Maman Chantal – <i>« Chez Maman BHB Doré »</i> (Carrefour du Grand Marché).<br/>"
        "<b>Activité :</b> Table de beignets soufflés, marmite de haricots rouges sautés et grande marmite de bouillie de maïs/mil.<br/>"
        "<b>Forfait Recommandé : COMMERCIA PRO</b> (indispensable pour débloquer le module <b>Cuisine & Fiches Recettes / FoodPrep</b>, le calcul du coût de revient par portion et par marmite, les relances d'ardoises et le Copilote IA).",
        body
    ))

    # 04h30
    story.append(Paragraph("⏰ 04h30 : Les Achats au Marché & Fiches Ingrédients (Module Dépenses & FoodPrep)", h3_time))
    story.append(Paragraph(
        "Maman Chantal part au marché de gros à l'aube avec son téléphone Android. Dans COMMERCIA, elle saisit ses achats du jour :<br/>"
        "• <b>Farine de blé (sac de 25 kg) :</b> 12 500 FCFA | <b>Bidon d'huile de friture (5 Litres) :</b> 6 000 FCFA<br/>"
        "• <b>Seau de haricots rouges frais :</b> 4 500 FCFA | <b>Maïs concassé pour bouillie :</b> 1 500 FCFA<br/>"
        "• <b>Sucre (2 kg) + Sel + Levure boulangère + Piment frais :</b> 2 000 FCFA<br/>"
        "• <b>Sac de charbon de bois de qualité :</b> 2 500 FCFA | <b>Sacs plastiques & emballages papier :</b> 1 000 FCFA<br/>"
        "➡️ <b>Total Investi ce matin (Charges Opérationnelles Directes) : 30 000 FCFA.</b>",
        body
    ))

    story.append(callout_box(
        "🍲 CE QUE COMMERCIA FOODPREP CALCULE AUTOMATIQUEMENT AVANT DE COMMENCER :",
        "Dans l'onglet <i>Cuisine & Recettes</i>, les 3 préparations de la matinée sont calibrées :<br/>"
        "1. <b>Bassine de Beignets (25 kg de farine) :</b> Rendement attendu = <b>400 beignets</b> (vendus 4 à 100 F, soit 25 F/unité). Potentiel = 10 000 F.<br/>"
        "2. <b>Marmite de Haricots Sautés :</b> Rendement = <b>75 portions</b> à 200 FCFA. Potentiel = 15 000 F.<br/>"
        "3. <b>Grande Marmite de Bouillie :</b> Rendement = <b>80 tasses</b> à 100 FCFA. Potentiel = 8 000 F.<br/>"
        "<i>Ventes combinées (combos complets, plats à emporter de 500 F et 1 000 F)</i> ➔ <b>Chiffre d'Affaires Brut Potentiel = 54 500 FCFA</b>.",
        '#F0FDF4', '#86EFAC', '#15803D'
    ))

    # 06h00
    story.append(Paragraph("⏰ 06h00 : Allumage des Foyers & Ouverture de Caisse (Module Caisse Journalière)", h3_time))
    story.append(Paragraph(
        "Installation au carrefour avec sa nièce. La grande poêle chauffe, l'huile crépite, les haricots mijotent.<br/>"
        "Avant de servir le premier client : Maman Chantal va dans <i>Caisse Journalière</i> ➔ <b>Ouvrir la Caisse</b>.<br/>"
        "Elle verse sa monnaie dans sa boîte métallique : <b>10 000 FCFA</b> (pièces de 25, 50, 100 F et petits billets de 500 et 1 000 F). "
        "Le statut passe au <b>VERT 🟢</b>. Chaque pièce qui entrera sera scellée mathématiquement.",
        body
    ))

    # 06h30 - 11h30
    story.append(Paragraph("⏰ 06h30 à 11h30 : Le Grand Rush du Carrefour (Module Vente Express)", h3_time))
    story.append(Paragraph(
        "Élèves, chauffeurs de taxi, mototaxis (benskineurs), maçons et fonctionnaires font la queue. Maman a les mains dans la farine : sa nièce tient le téléphone ou Maman valide d'un seul doigt grâce aux <b>touches tactiles de vente rapide</b> :",
        body
    ))
    story.append(Paragraph("• <b>Les Ventes Espèces (Cash) :</b> À 07h15, deux élèves prennent un combo classique (100 F beignets + 100 F haricots + 100 F bouillie = 300 F). Un clic sur la touche « Combo 300 F » ➔ Espèces. À 08h00, un taximan prend 200 F beignets + 200 F haricots pimentés (400 F cash).", bullet))
    story.append(Paragraph("• <b>Les Paiements Mobile Money (Wave / Orange Money) :</b> À 08h45, un jeune banquier n'a pas de monnaie. Il scanne le QR code Wave/OM scotché au parasol et envoie 1 500 FCFA pour le bureau. Clic sur <i>Mobile Money 1 500 F</i>. L'argent est compté dans les recettes mais <b>n'est pas ajouté à la boîte métallique de monnaie</b>. Aucune confusion possible le soir !", bullet))
    story.append(Paragraph("• <b>L'Ardoise / Dette du Quartier :</b> À 09h30, M. Paul, le menuisier du coin, prend 500 F de BHB et dit : <i>« Maman, note ça, le client me paie à 17h, je passe te donner ton argent »</i>. Au lieu d'écrire sur un carton qui se perd ou se tache d'huile rouge : Vente ➔ 500 F ➔ À Crédit ➔ Client : <i>Papa Paul Menuisier</i>. Sa dette est enregistrée en 2 secondes.", bullet))
    story.append(Paragraph("• <b>Dépense Imprévue :</b> À 10h15, il n'y a plus d'eau pour rincer les assiettes. Maman sort 500 F de la boîte pour acheter de l'eau fraîche et de service. Elle saisit : <i>Décaissement ➔ 500 F ➔ Motif : « Eau fraîche & service »</i>.", bullet))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2 : CLÔTURE, CALCUL DU BÉNÉFICE ET RÈGLE DES 3 POCHES
    # =========================================================================
    story.append(part_header("FIN DE JOURNÉE : CLÔTURE DE CAISSE, BÉNÉFICE NET & LES 3 POCHES", '#004BD6'))
    story.append(Spacer(1, 4))

    # 12h00
    story.append(Paragraph("⏰ 12h00 : La Vente du Dernier Beignet (Fin de Service)", h3_time))
    story.append(Paragraph(
        "À midi, le feu est éteint. La bassine est vide, la marmite de haricots est raclée jusqu'au fond, la bouillie est terminée.<br/>"
        "COMMERCIA récapitule la fournée : 390 beignets vendus sur 400 (10 offerts en dégustation ou fidélité), 72 portions de haricots et 78 tasses de bouillie écoulées.<br/>"
        "<b>Chiffre d'Affaires Brut Réalisé : 54 500 FCFA</b> (49 500 FCFA en espèces physiques dans la boîte et 5 000 FCFA sur Wave / Orange Money).",
        body
    ))

    # 12h30
    story.append(Paragraph("⏰ 12h30 : La Clôture de Caisse (Le Moment de Vérité)", h3_time))
    story.append(Paragraph(
        "Maman Chantal s'assoit à l'ombre avec sa boîte métallique et clique sur <b>Clôturer la Caisse</b> dans COMMERCIA :",
        body
    ))

    cloture_data = [
        [Paragraph("<b>Élément de Calcul</b>", table_hdr), Paragraph("<b>Montant COMMERCIA</b>", table_hdr), Paragraph("<b>Observation Opérationnelle</b>", table_hdr)],
        [Paragraph("Fond de roulement du matin (monnaie)", table_cell_bold), Paragraph("+ 10 000 FCFA", table_cell), Paragraph("Monnaie mise dans la boîte à 06h00", table_cell)],
        [Paragraph("Total entrées espèces (ventes physiques)", table_cell_bold), Paragraph("+ 49 500 FCFA", table_cell_green), Paragraph("Toutes les pièces et billets encaissés", table_cell)],
        [Paragraph("Dépense imprévue (eau fraîche)", table_cell_bold), Paragraph("- 500 FCFA", table_cell_red), Paragraph("Sortie justifiée et enregistrée à 10h15", table_cell)],
        [Paragraph("<b>SOLDE THÉORIQUE ATTENDU DANS LA BOÎTE</b>", table_cell_bold), Paragraph("<b>= 59 000 FCFA</b>", table_cell_bold), Paragraph("<b>Montant exact que Maman doit trouver</b>", table_cell_bold)],
    ]
    cloture_tbl = Table(cloture_data, colWidths=[6.2 * cm, 4.2 * cm, 8.2 * cm])
    cloture_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0B192C')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#FFFFFF')),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#FFFFFF')),
        ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#ECFDF5')),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(cloture_tbl)
    story.append(Spacer(1, 3))

    story.append(Paragraph(
        "Maman Chantal vide ses pièces et billets sur la table et compte : billets de 1 000/2 000 F (35 000 F) + pièces de 500 F (12 000 F) + pièces de 100, 50, 25 F (12 000 F) = <b>59 000 FCFA réels comptés</b>. "
        "🟢 <b>Écart de caisse = 0 FCFA</b>. Pas un franc égaré, la nièce a travaillé avec rigueur, la journée est scellée.",
        body
    ))

    # 12h45
    story.append(Paragraph("⏰ 12h45 : Le Calcul Automatique du « Vrai Bénéfice Net » du Jour", h3_time))
    story.append(callout_box(
        "💰 BILAN FINANCIER NET DE LA MATINÉE (CALCUL COMMERCIA) :",
        "• <b>Recettes Totales Réalisées (Cash 49 500 F + Wave 5 000 F) :</b> <b>54 500 FCFA</b><br/>"
        "• <b>Moins Coût des Ingrédients du Matin (Marché de gros) :</b> - 30 000 FCFA<br/>"
        "• <b>Moins Dépense d'Eau de Service :</b> - 500 FCFA<br/>"
        "➡️ <b>VRAI BÉNÉFICE NET DU JOUR = + 24 000 FCFA !</b><br/>"
        "<i>Maman Chantal a généré 24 000 FCFA de bénéfice pur en une seule matinée de vente (de 06h à 12h).</i>",
        '#ECFDF5', '#6EE7B7', '#047857'
    ))

    # 13h00
    story.append(Paragraph("⏰ 13h00 : L'Application Vitale de la « Règle des 3 Poches »", h3_time))
    story.append(Paragraph(
        "C'est la règle d'or enseignée par COMMERCIA pour ne jamais faire faillite. Maman Chantal prend 3 pochettes en tissu :<br/>"
        "• <b>Poche 1 (Le Réassort du Lendemain - 30 000 FCFA - INTOUCHABLE) :</b> Mis immédiatement dans son sac pour le marché de demain matin à 04h30 (farine, huile, haricot, charbon). Si elle touche à cette somme, demain elle ne peut pas frire et son activité meurt.<br/>"
        "• <b>Poche 2 (Charges Fixes & Tontine - 4 000 FCFA) :</b> 2 000 F pour sa tontine journalière des femmes du marché, 500 F pour le ticket de place de la mairie, et 1 500 F de provision pour renouveler sa poêle ou son parasol.<br/>"
        "• <b>Poche 3 (Le Bénéfice Personnel de Maman - 20 000 FCFA) :</b> Son salaire net et propre du jour ! Elle peut rentrer à la maison, payer la popote des enfants, les frais de scolarité et épargner l'esprit en paix.",
        body
    ))

    # 13h15
    story.append(Paragraph("⏰ 13h15 : Ce que le Copilote IA lui dit à la Fin du Service", h3_time))
    story.append(Paragraph("💬 <b>Maman Chantal :</b> « Copilote, est-ce que mes haricots ont été plus rentables que mes beignets aujourd'hui ? »", dialogue_q))
    story.append(Paragraph(
        "🤖 <b>Le Copilote IA répond en français simple :</b> « Maman Chantal, félicitations pour ta journée ! "
        "<b>(1) Tes haricots sont ta mine d'or :</b> ils t'ont coûté 4 500 F au marché et t'ont rapporté 15 000 F, soit une marge nette de <b>70%</b> ! "
        "<b>(2) Les beignets :</b> ils t'ont rapporté 55% de marge, mais beaucoup de clients en cherchaient encore après 11h. "
        "<b>(3) Conseil pour demain :</b> achète 1 seau et demi de haricots au lieu d'un seul car tu as fermé à midi alors que les ouvriers du chantier d'à côté cherchaient encore à manger. "
        "<b>(4) Rappel Ardoise :</b> M. Paul Menuisier te doit 500 F. L'application a préparé son rappel, fais-lui signe en passant devant son atelier ! »",
        dialogue_a
    ))

    # Tableau Comparatif
    story.append(Spacer(1, 3))
    story.append(Paragraph("<b>Pourquoi COMMERCIA Transforme la Vie de Maman Chantal ?</b>", h2_style))

    comp_data = [
        [Paragraph("<b>Sans COMMERCIA</b>", table_hdr), Paragraph("<b>Avec COMMERCIA PRO</b>", table_hdr)],
        [Paragraph("Mélange l'argent des achats, de la monnaie et de la maison dans le même pagne.", table_cell_red), Paragraph("<b>L'argent est séparé mathématiquement en 3 poches distinctes.</b>", table_cell_green)],
        [Paragraph("Donne des beignets à crédit sur des bouts de carton qui se perdent ou se tachent d'huile.", table_cell_red), Paragraph("<b>Les ardoises sont enregistrées avec nom et montant en 1 clic.</b>", table_cell_green)],
        [Paragraph("Peur que la nièce ou les aides volent des pièces dans la boîte de monnaie.", table_cell_red), Paragraph("<b>Solde théorique de caisse calculé au franc près, zéro écart toléré.</b>", table_cell_green)],
        [Paragraph("À la fin du mois, ignore totalement si elle a gagné ou perdu de l'argent.", table_cell_red), Paragraph("<b>Sait exactement combien de milliers de francs elle a gagné chaque jour.</b>", table_cell_green)],
    ]
    comp_tbl = Table(comp_data, colWidths=[9.3 * cm, 9.3 * cm])
    comp_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0B192C')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#FFFFFF')),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#FFFFFF')),
        ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#F8FAFC')),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(comp_tbl)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF Beignets BHB généré avec succès à : {filename}")

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'COMMERCIA_Guide_Pratique_Maman_Beignets_BHB.pdf'
    build_pdf(target)
