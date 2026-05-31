import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './timeline.html',
  styleUrl: './timeline.css'
})
export class Timeline implements OnInit {
  
  // Custom dry loops structure for decade milestones
  decades = [
    {
      id: '2010',
      title: 'Decade of Foundations (2010 - 2014)',
      years: [2010, 2011, 2012, 2013, 2014],
      iconClass: 'fas fa-graduation-cap',
      cardTitle: 'Milestone Memory',
      cardDesc: 'An outstanding achievement and milestone reached during the memorable year.'
    },
    {
      id: '2015',
      title: 'Decade of Growth (2015 - 2019)',
      years: [2015, 2016, 2017, 2018, 2019],
      iconClass: 'fas fa-award',
      cardTitle: 'Growth Step',
      cardDesc: 'Showcasing rapid academic success and state toppers emerging.'
    },
    {
      id: '2020',
      title: 'Decade of Innovation (2020 - 2024)',
      years: [2020, 2021, 2022, 2023, 2024],
      iconClass: 'fas fa-laptop-code',
      cardTitle: 'Digital Evolution',
      cardDesc: 'Highlighting the successful transition into interactive digital learning modules.'
    }
  ];

  futureYear = {
    id: '2025',
    title: 'The Future (2025)',
    year: 2025,
    iconClass: 'fas fa-rocket',
    cardTitle: 'Next Horizons',
    cardDesc: 'Redefining modern commerce education standards through next-generation resources.'
  };

  ngOnInit(): void {
    // Add visual scroll trigger listener
    this.initScrollAnimations();
  }

  initScrollAnimations(): void {
    setTimeout(() => {
      const sections = document.querySelectorAll('.year-section-custom');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      }, {
        threshold: 0.12
      });
      sections.forEach(sec => observer.observe(sec));
    }, 150);
  }

  scrollToSection(id: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
