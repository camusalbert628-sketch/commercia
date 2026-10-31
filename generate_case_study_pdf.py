import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
    HRFlowable,
)

def generate_pdf(output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=1.8 * cm,
        leftMargin=1.8 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0B192C'),
    )

    subtitle_style = ParagraphStyle(
        'SubtitleStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#0062FF'),
        textTransform='uppercase',
        spaceAfter=6,
    )

    badge_style = ParagraphStyle(
        'BadgeStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#FFFFFF'),
        alignment=1,
    )

    h2_style = ParagraphStyle(
        'H2Style',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#0B192C'),
        spaceBefore=12,
        spaceAfter=6,
    )

    h3_style = ParagraphStyle(
        'H3Style',
        parent=styles['Heading3'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#0062FF'),
        spaceBefore=8,
        spaceAfter=4,
    )

    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.2,
        leading=13.5,
        textColor=colors.HexColor('#334155'),
        spaceAfter=6,
    )

    bullet_style = ParagraphStyle(
        'BulletStyle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        leftIndent=12,
        firstLineIndent=-10,
        spaceAfter=3,
    )

    quote_style = ParagraphStyle(
        'QuoteStyle',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor('#0F172A'),
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#FFFFFF'),
        alignment=0,
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#1E293B'),
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#0F172A'),
    )

    table_cell_green = ParagraphStyle(
        'TableCellGreen',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#059669'),
    )

    table_cell_red = ParagraphStyle(
        'TableCellRed',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=colors.HexColor('#DC2626'),
    )

    story = []

    # Top Brand Bar
    brand_table = Table(
        [
            [
                Paragraph("COMMERCIA • ÉTUDE DE CAS RÉELLE", subtitle_style),
                Paragraph("<b>FORFAIT BUSINESS</b>", ParagraphStyle('TopBadge', parent=badge_style, textColor=colors.HexColor('#0062FF'), alignment=2)),
            ]
        ],
        colWidths=[12 * cm, 5.4 * cm]
    )
    brand_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(brand_table)
    story.append(Spacer(1, 4))

    # Main Title
    story.append(Paragraph("Pourquoi et Comment le Forfait Business Décuple la Rentabilité d'un Commerce en Croissance", header_style))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0062FF'), spaceAfter=10))

    # 1. Le Point de Départ
    story.append(Paragraph("1. Le Point de Départ : L’Histoire de Mme Aïcha", h2_style))
    story.append(Paragraph(
        "Mme Aïcha a débuté avec une boutique de prêt-à-porter au Centre-ville. Grâce à COMMERCIA, elle gérait ses ventes et sa caisse avec succès. Face à la forte demande, son activité a franchi un cap :",
        body_style
    ))
    story.append(Paragraph("• <b>Ouverture d’un 2e magasin :</b> Une annexe au Marché avec son propre stock.", bullet_style))
    story.append(Paragraph("• <b>4 collaborateurs :</b> 2 vendeuses au Centre-ville, 1 caissière à l'annexe et 1 logisticien.", bullet_style))
    story.append(Paragraph("• <b>Les limites bloquantes des premiers forfaits :</b> Le forfait <i>Gratuit</i> ne permet ni les collaborateurs ni le multi-magasins. Le forfait <i>Pro</i> est limité à 2 boutiques et 3 employés maximum.", bullet_style))
    story.append(Paragraph("• <b>Le problème critique du coulage :</b> Sans accès caissiers restreints, les vendeuses voyaient les marges brutes réelles (achat 4 500 F, revente 15 000 F). Certaines annulaient discrètement des ventes en espèces le soir pour empocher le liquide. <b>Perte nette constatée : plus de 150 000 FCFA par mois.</b>", bullet_style))

    # 2. Le Déclencheur
    story.append(Paragraph("2. Le Déclencheur : L'Encart d'Inscription au Plan Business", h2_style))
    story.append(Paragraph(
        "Lors de la tentative d'ajout de son 4e collaborateur, l'application COMMERCIA lui présente la solution sur-mesure :",
        body_style
    ))

    # Callout Box Plan Business
    box_content = [
        [
            Paragraph("<b>💎 COMMERCIA BUSINESS — Sécurisez votre empire commercial</b>", ParagraphStyle('BoxH', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#0F172A'), spaceAfter=4)),
        ],
        [
            Paragraph("• <b>Multi-Boutiques illimité :</b> Séparez les stocks, caisses et alertes de chaque magasin.<br/>"
                      "• <b>Comptes Caissiers illimités avec code PIN :</b> Prix d'achat fournisseurs 100% masqués, interdiction d'annuler ou de supprimer une vente enregistrée.<br/>"
                      "• <b>Trésorerie Multi-Comptes & Banques :</b> Rapprochement caisse physique, Wave, Orange Money et Banque.<br/>"
                      "• <b>Export de Gestion OHADA :</b> Bilan certifié pour les partenaires et banques.<br/>"
                      "<b>Tarif : 25 000 FCFA / mois</b> — Rentabilisé dès la 1ère semaine !", ParagraphStyle('BoxB', fontName='Helvetica', fontSize=8.8, leading=12.5, textColor=colors.HexColor('#1E293B')))
        ]
    ]
    box_table = Table(box_content, colWidths=[17.4 * cm])
    box_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F0F7FF')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#60A5FA')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(box_table)
    story.append(Spacer(1, 8))

    # 3. La Mise en Pratique Immédiate
    story.append(Paragraph("3. La Mise en Pratique Immédiate (Le Lendemain)", h2_style))
    story.append(Paragraph("<b>A. Déploiement du Réseau Multi-Boutiques en 10 secondes :</b>", h3_style))
    story.append(Paragraph("Dans la barre supérieure, Mme Aïcha configure ses deux entités étanches : <i>« Aïcha Mode - Centre-ville »</i> et <i>« Aïcha Mode - Annexe Marché »</i>. Depuis son smartphone chez elle, elle bascule en 1 clic pour suivre les encaissements séparés de chaque point de vente.", body_style))

    story.append(Paragraph("<b>B. Mise en place des 4 Caissiers Sécurisés & Anti-Fraude :</b>", h3_style))
    story.append(Paragraph("Dans l'onglet Équipe, chaque vendeuse reçoit un profil <b>« Caissier »</b> avec un code PIN :<br/>"
                           "1. <b>Prix d'achat masqués :</b> La caissière voit uniquement le prix de vente public (15 000 F). Le coût grossiste (4 500 F) est totalement invisible.<br/>"
                           "2. <b>Bouton suppression verrouillé :</b> Impossible d'effacer une vente après encaissement pour garder le cash.<br/>"
                           "3. <b>Clôture journalière avec alerte écart :</b> Le soir, le comptage réel des billets est comparé au solde théorique. Tout écart génère une notification immédiate à Mme Aïcha avec justification obligatoire.", body_style))

    story.append(Paragraph("<b>C. Rapprochement Trésorerie & Sécurisation des Fonds :</b>", h3_style))
    story.append(Paragraph("Après 380 000 F d'encaissements cumulés, Mme Aïcha fait virer le liquide du coffre vers son compte d'entreprise via Wave. Elle note un <i>« Virement interne »</i> : la trésorerie est sécurisée contre les cambriolages sans fausser le bénéfice d'exploitation.", body_style))
    story.append(Spacer(1, 6))

    # 4. Le Bilan Financier Chiffré & ROI
    story.append(Paragraph("4. Le Bilan Financier & Retour sur Investissement (ROI)", h2_style))

    roi_data = [
        [
            Paragraph("<b>Indicateur Clé</b>", table_header_style),
            Paragraph("<b>Avant COMMERCIA Business</b>", table_header_style),
            Paragraph("<b>Avec COMMERCIA Business</b>", table_header_style),
        ],
        [
            Paragraph("<b>Pertes par vol / fraudes de caisse</b>", table_cell_bold),
            Paragraph("-150 000 FCFA / mois", table_cell_red),
            Paragraph("<b>0 FCFA (anti-fraude scellé)</b>", table_cell_green),
        ],
        [
            Paragraph("<b>Ruptures de stock entre magasins</b>", table_cell_bold),
            Paragraph("Fréquentes (ventes perdues)", table_cell_style),
            Paragraph("<b>0 rupture (transferts anticipés)</b>", table_cell_green),
        ],
        [
            Paragraph("<b>Temps de contrôle le soir</b>", table_cell_bold),
            Paragraph("2 heures de disputes et d'erreurs", table_cell_style),
            Paragraph("<b>10 minutes de validation</b>", table_cell_green),
        ],
        [
            Paragraph("<b>Pilotage à distance du réseau</b>", table_cell_bold),
            Paragraph("Appels incessants & stress", table_cell_style),
            Paragraph("<b>Temps réel sur smartphone</b>", table_cell_green),
        ],
        [
            Paragraph("<b>Coût de l'abonnement Business</b>", table_cell_bold),
            Paragraph("0 FCFA", table_cell_style),
            Paragraph("-25 000 FCFA / mois", table_cell_style),
        ],
        [
            Paragraph("<b>GAIN NET MENSUEL GÉNÉRÉ</b>", ParagraphStyle('GainH', fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor('#0F172A'))),
            Paragraph("Déficit invisible", table_cell_red),
            Paragraph("<b>+125 000 FCFA d'économies nettes / mois</b>", ParagraphStyle('GainVal', fontName='Helvetica-Bold', fontSize=9.5, textColor=colors.HexColor('#059669'))),
        ],
    ]

    roi_table = Table(roi_data, colWidths=[6.0 * cm, 5.7 * cm, 5.7 * cm])
    roi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0B192C')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0, 1), (-1, 1), colors.HexColor('#FFFFFF')),
        ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (0, 3), (-1, 3), colors.HexColor('#FFFFFF')),
        ('BACKGROUND', (0, 4), (-1, 4), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (0, 5), (-1, 5), colors.HexColor('#FFFFFF')),
        ('BACKGROUND', (0, 6), (-1, 6), colors.HexColor('#ECFDF5')),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(roi_table)
    story.append(Spacer(1, 10))

    # 5. La Formule d'Accroche Commerciale
    story.append(Paragraph("5. La Formule d'Accroche Commerciale Décisive", h2_style))
    quote_box = [
        [
            Paragraph(
                "« Le Forfait Business ne vous coûte pas de l'argent : il vous en fait économiser dès la première semaine en éliminant les erreurs de caisse, les vols de stock et le temps perdu. À 25 000 FCFA/mois, c'est l'équivalent du salaire d'un demi-gardien pour protéger des millions de marchandises et piloter votre entreprise l'esprit tranquille. »",
                quote_style
            )
        ]
    ]
    quote_table = Table(quote_box, colWidths=[17.4 * cm])
    quote_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#FEF3C7')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#F59E0B')),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
    ]))
    story.append(quote_table)

    # Footer note
    story.append(Spacer(1, 14))
    story.append(Paragraph("Document officiel édité par COMMERCIA — Le Copilote Financier des Entreprises Africaines • https://commercia-app.vercel.app", ParagraphStyle('Foot', fontName='Helvetica', fontSize=7.5, textColor=colors.HexColor('#94A3B8'), alignment=1)))

    doc.build(story)
    print(f"PDF généré avec succès à : {output_path}")

if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'COMMERCIA_Etude_de_Cas_Plan_Business.pdf'
    generate_pdf(target)
