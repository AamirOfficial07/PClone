import { Routes } from '@angular/router';
import { PostListComponent } from './post-list/post-list.component';
import { PostComposerComponent } from './post-composer/post-composer.component';
import { PostDetailComponent } from './post-detail/post-detail.component';

export const POSTS_ROUTES: Routes = [
  {
    path: '',
    component: PostListComponent
  },
  {
    path: 'new',
    component: PostComposerComponent
  },
  {
    path: ':postId',
    component: PostDetailComponent
  }
];