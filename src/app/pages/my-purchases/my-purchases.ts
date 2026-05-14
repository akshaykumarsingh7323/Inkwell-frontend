import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-my-purchases',
  standalone: true,
  imports: [CommonModule, Navbar, Footer],
  templateUrl: './my-purchases.html',
  styleUrl: './my-purchases.css'
})
export class MyPurchases implements OnInit {
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);

  purchases: any[] = [];
  isLoading = true;

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.paymentService.getUserPayments(user.userId).subscribe({
          next: (payments) => {
            this.purchases = payments;
            this.isLoading = false;
          },
          error: () => this.isLoading = false
        });
      }
    });
  }
}
