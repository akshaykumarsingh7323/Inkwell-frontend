import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from '../../services/payment.service';

@Component({
  selector: 'app-admin-revenue-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-revenue-dashboard.html',
  styleUrl: './admin-revenue-dashboard.css'
})
export class AdminRevenueDashboard implements OnInit {
  private paymentService = inject(PaymentService);

  revenueStats: any = null;
  transactions: any[] = [];
  topAuthors: any[] = [];
  isLoading = true;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.paymentService.getTotalRevenue().subscribe(stats => this.revenueStats = stats);
    this.paymentService.getRecentTransactions().subscribe(txs => this.transactions = txs);
    this.paymentService.getTopAuthors().subscribe(authors => {
      this.topAuthors = authors.sort((a, b) => b.totalEarnings - a.totalEarnings);
      this.isLoading = false;
    });
  }
}
