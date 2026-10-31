# -*- coding: utf-8 -*-
"""
COMMERCIA - Générateur de Guide Pratique & Étude de Cas Master (PDF)
Document de synthèse ultra-complet intégrant :
- Partie 1 : Une Journée Complète dans la Peau d'un Commerçant de Vêtements (Boutique Mode & Tendance)
- Partie 2 : L'Extension en Ligne (WhatsApp VIP, TikTok Live, Coursiers COD & Canaux)
- Partie 3 : Le Passage à l'Échelle & Le Forfait Business (Étude de Cas Mme Aïcha & ROI)
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
            self.drawString(1.3 * cm, A4[1] - 0.9 * cm, "COMMERCIA • Guide Opérationnel & Cas Concrets (Magasin, En Ligne, Multi-Boutiques)")
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
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#FFFFFF'),
    )

    table_cell = ParagraphStyle(
        'TCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=c_slate,
    )

    table_cell_bold = ParagraphStyle(
        'TCellB',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=c_navy,
    )

    table_cell_green = ParagraphStyle(
        'TCellG',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.2,
        leading=11,
        textColor=colors.HexColor('#059669'),
    )

    table_cell_red = ParagraphStyle(
        'TCellR',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
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
    # PAGE 1 : PARTIE 1 - UNE JOURNÉE COMPLÈTE EN MAGASIN (MODE & TENDANCE)
    # =========================================================================
    story.append(Paragraph("COMMERCIA • CAS CONCRETS & GUIDE PRATIQUE", tagline))
    story.append(Paragraph("Le Manuel Opérationnel : Du Commerce en Magasin à la Vente en Ligne et au Réseau Multi-Boutiques", main_title))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_blue, spaceAfter=5))

    story.append(part_header("PARTIE 1 : UNE JOURNÉE COMPLÈTE DANS LA PEAU D'UN COMMERÇANT (Boutique « Mode & Tendance »)", '#0B192C'))
    story.append(Spacer(1, 3))

    story.append(Paragraph(
        "<b>Profil :</b> Vente de vêtements sur cintre et déballages réguliers de ballots de friperie d'importation (qualité crème / 1er choix). "
        "<b>Forfait :</b> COMMERCIA PRO (indispensable pour débloquer le module Lots & Ballots, le calcul automatique du point mort, les relances WhatsApp et le Copilote IA).",
        body
    ))

    # 07h30
    story.append(Paragraph("⏰ 07h30 : Réception du Ballot & Landed Cost (Module Lots & Déballages)", h3_time))
    story.append(Paragraph(
        "Un transporteur livre ce matin 1 ballot de chemises et polos hommes d'Europe. J'ouvre COMMERCIA ➔ <i>« Lots & Déballages »</i> ➔ <i>« + Nouvelle Campagne »</i> :<br/>"
        "• <b>Nom :</b> Ballot Chemises Homme Londres #4 | <b>Prix d'achat ballot :</b> 180 000 FCFA | <b>Transport & Manutention :</b> 20 000 FCFA<br/>"
        "• <b>Investissement total engagé (Landed Cost) :</b> <b>200 000 FCFA</b>.<br/>"
        "Avec mes employés, nous ouvrons le ballot et trions les 150 pièces en 3 catégories :<br/>"
        "• <b>1er Choix (VIP / Marque) :</b> 40 pièces à vendre à 5 000 FCFA l'unité (potentiel : 200 000 F).<br/>"
        "• <b>2e Choix (Standard) :</b> 60 pièces à vendre à 2 500 FCFA l'unité (potentiel : 150 000 F).<br/>"
        "• <b>3e Choix (Tout-venant / Déstockage) :</b> 50 pièces à vendre à 1 000 FCFA l'unité (potentiel : 50 000 F).",
        body
    ))
    story.append(callout_box(
        "⚡ CE QUE COMMERCIA CALCULE IMMÉDIATEMENT :",
        "• <b>Chiffre d'affaires potentiel total :</b> 40×5 000 + 60×2 500 + 50×1 000 = <b>400 000 FCFA</b>.<br/>"
        "• <b>Le Point Mort (Moment Magique) :</b> L'application m'indique : <i>« Dès que tu encaisses 200 000 FCFA (environ 55 articles vendus), ton ballot est remboursé à 100%. Les 95 articles restants seront du PUR BÉNÉFICE (100% net) ! »</i>",
        '#F0FDF4', '#86EFAC', '#15803D'
    ))

    # 08h00
    story.append(Paragraph("⏰ 08h00 : Ouverture du Magasin (Module Caisse Journalière)", h3_time))
    story.append(Paragraph(
        "Avant de faire entrer le premier client : je vais dans <i>Caisse Journalière</i> ➔ <i>Ouvrir la Caisse</i>. "
        "Je mets <b>25 000 FCFA</b> de monnaie dans mon tiroir (pièces de 100, 200, 500 et billets de 1 000/2 000 F). "
        "Le statut passe au <b>VERT 🟢</b>. Chaque franc est désormais sous surveillance mathématique.",
        body
    ))

    # 09h00 - 17h00
    story.append(Paragraph("⏰ 09h00 à 17h00 : Les Ventes au Comptoir (Module Nouvelle Vente)", h3_time))
    story.append(Paragraph("• <b>09h30 (Vente Espèces) :</b> Un client choisit 3 chemises 1er choix (15 000 F). Je tape 15 000 F ➔ Espèces. Le tiroir prend +15 000 F, le stock du ballot perd 3 chemises. Je lui transmets son reçu WhatsApp avec mot de remerciement en 1 clic.", bullet))
    story.append(Paragraph("• <b>11h15 (Vente Mobile Money / Wave) :</b> Une cliente prend 4 polos 2e choix (10 000 F) et paie par Wave / Orange Money. COMMERCIA enregistre la vente sans polluer le tiroir d'espèces physique.", bullet))
    story.append(Paragraph("• <b>14h00 (Vente à Crédit / Ardoise) :</b> M. Bamba prend pour 30 000 F d'habits. Il donne 10 000 F en cash et demande de payer 20 000 F à la fin du mois. Je valide : Acompte espèces 10 000 F, Reste à crédit 20 000 F. Sa dette est rattachée à son profil dans <i>Clients & Dettes</i>.", bullet))
    story.append(Paragraph("• <b>15h30 (Dépense imprévue) :</b> Achat de sacs plastiques et déjeuner du coursier (4 000 F). Je sors 4 000 F du tiroir ➔ Décaissement ➔ motif « Sacs & repas ».", bullet))

    # 17h30
    story.append(Paragraph("⏰ 17h30 : Consultation Stratégique avec le Copilote IA", h3_time))
    story.append(Paragraph("💬 <b>Moi :</b> « Copilote, où en est mon ballot aujourd'hui ? »", dialogue_q))
    story.append(Paragraph("🤖 <b>Copilote :</b> « Sur ton ballot Chemises Homme Londres #4, tu as déjà encaissé 85 000 FCFA (22 articles vendus sur 150). Ton taux d'amortissement est de 42,5%. Il te reste seulement 33 articles à vendre (115 000 FCFA) pour rembourser l'intégralité de ta mise de départ. Après ça, les 95 pièces restantes seront du pur bénéfice ! »", dialogue_a))
    story.append(Paragraph("💬 <b>Moi :</b> « Rédige-moi un mot doux pour relancer M. Bamba pour son ardoise de 20 000 F. »", dialogue_q))
    story.append(Paragraph("🤖 <b>Copilote :</b> Message WhatsApp prêt à coller : <i>« Bonjour M. Bamba, petit rappel amical de ton solde de 20 000 F chez Mode & Tendance pour tes achats du jour. Merci pour ta fidélité ! »</i>", dialogue_a))

    # 19h30
    story.append(Paragraph("⏰ 19h30 : Fermeture et Clôture (Moment de Vérité)", h3_time))
    story.append(Paragraph(
        "Rideau de fer tiré. Je clique sur <i>Clôturer la Caisse</i>. "
        "Attendu dans le tiroir : Fond initial 25 000 F + Entrées cash 65 000 F - Dépenses 4 000 F = <b>86 000 FCFA</b>. "
        "Je compte mes billets et pièces réels : <b>86 000 FCFA</b>. <b>Écart = 0 FCFA</b>. Aucune perte, zéro vol, mes employés ont été rigoureux.",
        body
    ))

    # 19h45
    story.append(Paragraph("⏰ 19h45 : Application de la Règle des 3 Poches (Pour Devenir Riche)", h3_time))
    story.append(Paragraph(
        "Sur les 65 000 F de cash encaissé aujourd'hui, j'applique la directive COMMERCIA :<br/>"
        "• <b>Poche 1 (Capital Réassort - 70% ➔ 45 500 F) :</b> Dans l'enveloppe « Achat prochain ballot ». Intouchable.<br/>"
        "• <b>Poche 2 (Charges & Loyer - 15% ➔ 9 750 F) :</b> Enveloppe pour payer le loyer de la boutique à la fin du mois.<br/>"
        "• <b>Poche 3 (Bénéfice Net Propriétaire - 15% ➔ 9 750 F) :</b> Mon argent personnel ramené à la maison sans mettre en danger ma boutique.",
        body
    ))

    story.append(callout_box(
        "⚠️ POURQUOI CETTE JOURNÉE AURAIT ÉTÉ UN ENFER SANS L'APPLICATION ?",
        "1. Sans l'appli, impossible de savoir à quel moment précis le ballot devient rentable.<br/>"
        "2. On aurait mélangé l'argent Wave avec l'argent liquide et les crédits dehors.<br/>"
        "3. On aurait puisé dans la caisse pour des dépenses personnelles en se croyant riche, alors qu'on « mangeait » le capital du prochain ballot !",
        '#FEF2F2', '#FCA5A5', '#991B1B'
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2 : PARTIE 2 - L'EXTENSION EN LIGNE (TIKTOK, WHATSAPP, COURSIERS COD)
    # =========================================================================
    story.append(part_header("PARTIE 2 : L'EXTENSION EN LIGNE — WHATSAPP VIP, TIKTOK LIVE & COURSIERS MOTO (COD)", '#004BD6'))
    story.append(Spacer(1, 4))

    story.append(Paragraph(
        "Si vous décidez de vendre aussi en ligne (WhatsApp, TikTok Live, Facebook, Instagram), COMMERCIA devient une véritable arme de guerre ! "
        "Dans le commerce de vêtements en ligne, <b>80% des commerçants font faillite à cause de 3 pièges mortels</b> : "
        "<b>(1) Les livreurs moto</b> qui partent avec la marchandise et ne reversent pas tout le cash, "
        "<b>(2) Le double stock</b> (vendre une robe au comptoir alors qu'une cliente vient de la commander en ligne), "
        "<b>(3) Les pubs sponsorisées à l'aveugle</b> sans savoir si elles rapportent réellement.",
        body
    ))

    story.append(Paragraph("1. Le Matin : Déballage en Direct sur TikTok / WhatsApp (Zéro Double Stock)", h2_style))
    story.append(Paragraph(
        "Vous ouvrez votre ballot en vidéo (Live TikTok ou Statuts WhatsApp VIP). "
        "Les clientes s'emballent en direct : <i>« Je prends la veste rouge ! »</i>, <i>« Réserve-moi le pantalon blanc ! »</i>.<br/>"
        "Vous ouvrez COMMERCIA : vous créez la commande en 10 secondes. "
        "<b>Le stock en magasin physique diminue instantanément</b> : aucun risque qu'un client au comptoir prenne le même article.",
        body
    ))

    story.append(Paragraph("2. La Gestion des Livraisons & Coursiers (Module Livraisons & Expéditions)", h2_style))
    story.append(Paragraph(
        "En ligne, la majorité des clients paient à la livraison (<b>Cash On Delivery - COD</b>). "
        "Dans l'onglet <i>Livraisons</i> ➔ <i>+ Nouvelle Livraison</i> :<br/>"
        "• <b>Cliente :</b> Aminata Diallo (📱 07 00 11 22) | <b>Articles :</b> 2 Robes de soirée.<br/>"
        "• <b>Adresse :</b> Cocody Angré, Repère : Carrefour Pétro Ivoire face pharmacie.<br/>"
        "• <b>Montant à encaisser par le coursier :</b> 25 000 FCFA | <b>Frais livraison :</b> 2 000 FCFA (payés par la cliente).<br/>"
        "• <b>Livreur attribué :</b> Moussa Moto (📱 05 44 33 22).<br/>"
        "<b>Le Bon de Livraison WhatsApp en 1 Clic :</b> Vous cliquez sur l'icône WhatsApp à côté de la livraison. COMMERCIA génère un bordereau complet et l'envoie directement à votre livreur Moussa avec l'adresse, le repère GPS, le téléphone de la cliente et la somme exacte à récupérer.<br/>"
        "<b>Le Suivi en Temps Réel :</b> 🟡 En attente ➔ 🔵 En cours de livraison ➔ 🟢 Livré & Encaissé.",
        body
    ))

    story.append(Paragraph("3. Le Retour du Livreur le Soir (La Réconciliation Sécurisée)", h2_style))
    story.append(Paragraph(
        "À 18h30, le coursier Moussa revient à la boutique après 4 courses pour un total de <b>60 000 FCFA encaissés en liquide</b> chez vos clientes en ligne.<br/>"
        "Dans <i>Livraisons</i>, vous cochez les 4 commandes comme <i>Livrées</i>. Moussa vous tend les 60 000 FCFA.<br/>"
        "Vous mettez ces 60 000 F dans votre tiroir-caisse physique :<br/>"
        "➡️ <b>COMMERCIA intègre automatiquement ces encaissements dans votre Caisse Journalière.</b><br/>"
        "<i>Si Moussa ne vous donne que 50 000 F en disant qu'une cliente a refusé le colis, vous le voyez immédiatement sur votre tableau de bord. Impossible qu'un coursier garde votre argent.</i>",
        body
    ))

    story.append(Paragraph("4. Quel Canal en Ligne vous Rend le Plus Riche ? (Module Canaux & Croissance)", h2_style))
    story.append(Paragraph(
        "C'est la fonctionnalité préférée des vendeurs en ligne dans COMMERCIA PRO. Dans l'onglet <i>Croissance & Canaux</i>, vous suivez d'où viennent vos clients :<br/>"
        "• <b>Statuts WhatsApp VIP :</b> 0 F dépensé en pub ➔ <b>145 000 FCFA de bénéfice net</b>.<br/>"
        "• <b>TikTok Live :</b> 0 F dépensé ➔ <b>80 000 FCFA de bénéfice net</b>.<br/>"
        "• <b>Facebook Ads sponsorisées :</b> 20 000 F dépensés en pub ➔ 110 000 F de ventes ➔ Rentabilité validée avec calcul automatique du <b>Coût d'Acquisition Client (CAC)</b>.",
        body
    ))

    story.append(Paragraph("5. Consultation du Copilote IA pour la Vente en Ligne", h2_style))
    story.append(Paragraph("💬 <b>Moi :</b> « Copilote, est-ce que mes ventes en ligne ont été plus rentables que mes ventes au comptoir cette semaine ? »", dialogue_q))
    story.append(Paragraph("🤖 <b>Le Copilote IA analyse vos données et répond :</b> « Oui ! Les ventes en ligne via tes statuts WhatsApp ont généré une marge nette de 54% contre 38% en boutique physique, car tes clientes en ligne achètent les pièces VIP du 1er choix sans négocier le prix. Conseil : fais 2 déballages WhatsApp par semaine le mercredi et le samedi soir ! »", dialogue_a))

    story.append(callout_box(
        "💡 EN RÉSUMÉ : LA FORCE DU SYSTÈME UNIFIÉ",
        "Vendre en ligne avec COMMERCIA, c'est réunir dans une seule et même application : vos ventes en boutique physique, vos commandes sur les réseaux sociaux, vos livreurs moto et colis expédiés, vos paiements Wave / Orange Money et votre tiroir-caisse physique, sans jamais vous mélanger les pinceaux !",
        '#EFF6FF', '#93C5FD', '#1D4ED8'
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3 : PARTIE 3 - LE PASSAGE À L'ÉCHELLE & LE FORFAIT BUSINESS
    # =========================================================================
    story.append(part_header("PARTIE 3 : LE PASSAGE À L'ÉCHELLE & LE FORFAIT BUSINESS (L'Histoire de Mme Aïcha)", '#1E3E62'))
    story.append(Spacer(1, 4))

    story.append(Paragraph("1. La Crise de Croissance : Pourquoi le Gratuit et le Pro ne suffisent plus", h2_style))
    story.append(Paragraph(
        "Mme Aïcha gère désormais 2 boutiques (Centre-ville + Annexe Marché) et emploie 4 collaborateurs (2 vendeuses, 1 caissière, 1 logisticien).<br/>"
        "• Le forfait <i>Gratuit</i> ne permet ni les collaborateurs ni le multi-magasins.<br/>"
        "• Le forfait <i>Pro</i> est bridé à 2 boutiques et 3 employés maximum.<br/>"
        "• <b>La faille de sécurité :</b> Sans comptes caissiers verrouillés, les employés voyaient les coûts d'achat grossiste (4 500 F) et supprimaient des ventes l'après-midi pour voler le liquide. <b>Perte mensuelle : 150 000 FCFA.</b>",
        body
    ))

    story.append(Paragraph("2. Les 3 Piliers du Forfait Business en Action", h2_style))
    story.append(Paragraph(
        "<b>A. Multi-Boutiques instantané :</b> Sépare hermétiquement les stocks, les tiroirs-caisses et les alertes. Bascule en 1 clic dans la barre supérieure pour superviser son réseau à distance.<br/>"
        "<b>B. Caissiers sécurisés avec code PIN :</b> Prix d'achat grossiste et marges nettes masqués à 100%. Bouton de suppression de vente désactivé. Comptage obligatoire le soir avec alerte immédiate au propriétaire en cas d'écart.<br/>"
        "<b>C. Trésorerie & Export OHADA :</b> Centralisation multi-comptes (Caisse, Wave, Banque) et bilans certifiés pour lever des financements bancaires.",
        body
    ))

    story.append(Spacer(1, 3))
    story.append(Paragraph("<b>Tableau Comparatif du Retour sur Investissement (ROI) Business :</b>", h3_time))

    roi_data = [
        [Paragraph("<b>Indicateur Clé</b>", table_hdr), Paragraph("<b>Avant Forfait Business</b>", table_hdr), Paragraph("<b>Avec Forfait Business (25 000 F)</b>", table_hdr)],
        [Paragraph("Pertes par vol / fraudes de caisse", table_cell_bold), Paragraph("-150 000 FCFA / mois", table_cell_red), Paragraph("<b>0 FCFA (anti-fraude scellé)</b>", table_cell_green)],
        [Paragraph("Ruptures de stock entre magasins", table_cell_bold), Paragraph("Fréquentes (ventes perdues)", table_cell), Paragraph("<b>0 rupture (transferts en direct)</b>", table_cell_green)],
        [Paragraph("Temps de pointage le soir", table_cell_bold), Paragraph("2h de disputes et d'erreurs", table_cell), Paragraph("<b>10 minutes de validation</b>", table_cell_green)],
        [Paragraph("Pilotage à distance du réseau", table_cell_bold), Paragraph("Appels incessants & stress", table_cell), Paragraph("<b>Temps réel sur smartphone</b>", table_cell_green)],
        [Paragraph("Coût de l'abonnement Business", table_cell_bold), Paragraph("0 FCFA", table_cell), Paragraph("-25 000 FCFA / mois", table_cell)],
        [Paragraph("<b>GAIN NET MENSUEL GÉNÉRÉ</b>", table_cell_bold), Paragraph("Déficit invisible", table_cell_red), Paragraph("<b>+125 000 FCFA d'économies nettes / mois</b>", table_cell_green)],
    ]
    roi_tbl = Table(roi_data, colWidths=[6.2 * cm, 6.2 * cm, 6.2 * cm])
    roi_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0B192C')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#FFFFFF')),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#FFFFFF')),
        ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (0, 5), (-1, 5), colors.HexColor('#FFFFFF')),
        ('BACKGROUND', (0, 6), (-1, 6), colors.HexColor('#ECFDF5')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(roi_tbl)
    story.append(Spacer(1, 6))

    # Formule d'Accroche Finale
    story.append(callout_box(
        "🎯 LA FORMULE D'ACCROCHE COMMERCIALE DÉCISIVE :",
        "« Le Forfait Business ne vous coûte pas de l'argent : il vous en fait économiser dès la première semaine en éliminant les erreurs de caisse, les vols de stock et le temps perdu. À 25 000 FCFA/mois, c'est l'équivalent du salaire d'un demi-gardien pour protéger des millions de marchandises et piloter votre réseau l'esprit tranquille. »",
        '#FEF3C7', '#F59E0B', '#92400E'
    ))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Master PDF généré avec succès à : {filename}")

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'COMMERCIA_Guide_Pratique_et_Cas_Business.pdf'
    build_pdf(target)
