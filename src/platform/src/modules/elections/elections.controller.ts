import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ElectionsService } from './elections.service';
import {
  CreateElectionDto,
  UpdateElectionDto,
  SearchElectionsDto,
  ApiResponse as ApiResponseDto,
  PaginatedResponse,
  UserRole,
  ElectionType,
  ElectionStatus,
} from '@hoa-platform/shared';
import { RolesGuard } from '@hoa-platform/shared';
import { Roles, TenantRequired } from '@hoa-platform/shared';
import { JwtPayload } from '@hoa-platform/shared';

@ApiTags('Elections')
@Controller('elections')
@UseGuards(RolesGuard)
@ApiBearerAuth()
export class ElectionsController {
  constructor(private readonly electionsService: ElectionsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @ApiOperation({ summary: 'Create a new election' })
  @ApiResponse({ status: 201, description: 'Election created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(@Body() createElectionDto: CreateElectionDto): Promise<ApiResponseDto<any>> {
    const election = await this.electionsService.create(createElectionDto);
    return {
      success: true,
      data: election,
      message: 'Election created successfully',
    };
  }

  @Get()
  @TenantRequired()
  @ApiOperation({ summary: 'Get all elections with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Elections retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findAll(
    @Query() searchDto: SearchElectionsDto,
    @Request() req: any,
  ): Promise<PaginatedResponse<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const result = await this.electionsService.findAll(searchDto, tenantId);
    return {
      success: true,
      data: result.elections,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        total_pages: Math.ceil(result.total / result.limit),
      },
    };
  }

  @Get('active')
  @TenantRequired()
  @ApiOperation({ summary: 'Get currently active elections' })
  @ApiResponse({ status: 200, description: 'Active elections retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getActiveElections(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const elections = await this.electionsService.getActiveElections(tenantId);
    return {
      success: true,
      data: elections,
    };
  }

  @Get('nomination-phase')
  @TenantRequired()
  @ApiOperation({ summary: 'Get elections in nomination phase' })
  @ApiResponse({ status: 200, description: 'Elections in nomination phase retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getElectionsInNominationPhase(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const elections = await this.electionsService.getElectionsInNominationPhase(tenantId);
    return {
      success: true,
      data: elections,
    };
  }

  @Get('voting-period')
  @TenantRequired()
  @ApiOperation({ summary: 'Get elections in voting period' })
  @ApiResponse({ status: 200, description: 'Elections in voting period retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getElectionsInVotingPeriod(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const elections = await this.electionsService.getElectionsInVotingPeriod(tenantId);
    return {
      success: true,
      data: elections,
    };
  }

  @Get('ending-soon')
  @TenantRequired()
  @ApiOperation({ summary: 'Get elections ending soon' })
  @ApiResponse({ status: 200, description: 'Elections ending soon retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getElectionsEndingSoon(
    @Query('days') days: number = 7,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const elections = await this.electionsService.getElectionsEndingSoon(tenantId, days);
    return {
      success: true,
      data: elections,
    };
  }

  @Get('statistics')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @ApiOperation({ summary: 'Get election statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async getStatistics(@Request() req: any): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const tenantId = currentUser.tenant_id;

    const statistics = await this.electionsService.getStatistics(tenantId);
    return {
      success: true,
      data: statistics,
    };
  }

  @Get('by-creator/:creatorId')
  @TenantRequired()
  @ApiOperation({ summary: 'Get elections by creator' })
  @ApiResponse({ status: 200, description: 'Elections by creator retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async findByCreator(
    @Param('creatorId') creatorId: string,
    @Query() searchDto: SearchElectionsDto,
  ): Promise<ApiResponseDto<any>> {
    const result = await this.electionsService.findAll({ ...searchDto, created_by: creatorId });
    return {
      success: true,
      data: result.elections,
      total: result.total,
    };
  }

  @Get(':id')
  @TenantRequired()
  @ApiOperation({ summary: 'Get election by ID' })
  @ApiResponse({ status: 200, description: 'Election retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Election not found' })
  async findOne(@Param('id') id: string): Promise<ApiResponseDto<any>> {
    const election = await this.electionsService.findOne(id);
    return {
      success: true,
      data: election,
    };
  }

  // Election lifecycle endpoints
  @Post(':id/schedule')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Schedule an election' })
  @ApiResponse({ status: 200, description: 'Election scheduled successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async schedule(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const election = await this.electionsService.scheduleElection(id, currentUser.sub);
    return {
      success: true,
      data: election,
      message: 'Election scheduled successfully',
    };
  }

  @Post(':id/start-nomination')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start nomination phase' })
  @ApiResponse({ status: 200, description: 'Nomination phase started successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async startNominationPhase(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const election = await this.electionsService.startNominationPhase(id, currentUser.sub);
    return {
      success: true,
      data: election,
      message: 'Nomination phase started successfully',
    };
  }

  @Post(':id/start-campaign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start campaign period' })
  @ApiResponse({ status: 200, description: 'Campaign period started successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async startCampaignPeriod(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const election = await this.electionsService.startCampaignPeriod(id, currentUser.sub);
    return {
      success: true,
      data: election,
      message: 'Campaign period started successfully',
    };
  }

  @Post(':id/start-voting')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start voting period' })
  @ApiResponse({ status: 200, description: 'Voting period started successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async startVotingPeriod(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const election = await this.electionsService.startVotingPeriod(id, currentUser.sub);
    return {
      success: true,
      data: election,
      message: 'Voting period started successfully',
    };
  }

  @Post(':id/end-voting')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End voting period' })
  @ApiResponse({ status: 200, description: 'Voting period ended successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async endVotingPeriod(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const election = await this.electionsService.endVotingPeriod(id, currentUser.sub);
    return {
      success: true,
      data: election,
      message: 'Voting period ended successfully',
    };
  }

  @Post(':id/complete')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete election' })
  @ApiResponse({ status: 200, description: 'Election completed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async complete(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const election = await this.electionsService.completeElection(id, currentUser.sub);
    return {
      success: true,
      data: election,
      message: 'Election completed successfully',
    };
  }

  // Candidate management endpoints
  @Post(':id/nominate-candidate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER, UserRole.PROPERTY_OWNER, UserRole.RESIDENT)
  @TenantRequired()
  @ApiOperation({ summary: 'Nominate a candidate' })
  @ApiResponse({ status: 201, description: 'Candidate nominated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async nominateCandidate(
    @Param('id') id: string,
    @Body() nominationData: {
      position_id: string;
      user_id: string;
      statement?: string;
      qualifications?: string[];
      experience?: string;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const election = await this.electionsService.nominateCandidate(
      id,
      {
        ...nominationData,
        nominator_id: currentUser.sub,
      },
      currentUser.sub,
    );
    return {
      success: true,
      data: election,
      message: 'Candidate nominated successfully',
    };
  }

  @Post(':id/approve-candidate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a candidate' })
  @ApiResponse({ status: 200, description: 'Candidate approved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async approveCandidate(
    @Param('id') id: string,
    @Body('candidate_id') candidateId: string,
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const election = await this.electionsService.approveCandidate(id, candidateId, currentUser.sub);
    return {
      success: true,
      data: election,
      message: 'Candidate approved successfully',
    };
  }

  @Post(':id/reject-candidate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a candidate' })
  @ApiResponse({ status: 200, description: 'Candidate rejected successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async rejectCandidate(
    @Param('id') id: string,
    @Body() rejectData: {
      candidate_id: string;
      reason: string;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const election = await this.electionsService.rejectCandidate(
      id,
      rejectData.candidate_id,
      rejectData.reason,
      currentUser.sub,
    );
    return {
      success: true,
      data: election,
      message: 'Candidate rejected successfully',
    };
  }

  @Post(':id/withdraw-candidate')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER, UserRole.PROPERTY_OWNER, UserRole.RESIDENT)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Withdraw candidate nomination' })
  @ApiResponse({ status: 200, description: 'Candidate withdrawal processed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async withdrawCandidate(
    @Param('id') id: string,
    @Body() withdrawData: {
      candidate_id: string;
      reason: string;
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const election = await this.electionsService.withdrawCandidate(
      id,
      withdrawData.candidate_id,
      withdrawData.reason,
      currentUser.sub,
    );
    return {
      success: true,
      data: election,
      message: 'Candidate withdrawal processed successfully',
    };
  }

  // Template endpoints
  @Post('create-board-election')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @ApiOperation({ summary: 'Create board member election' })
  @ApiResponse({ status: 201, description: 'Board election created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async createBoardElection(
    @Body() electionData: {
      title: string;
      description: string;
      positions: Array<{
        title: string;
        description: string;
        term_length_months: number;
        max_winners: number;
      }>;
      voting_schedule: {
        nomination_start_date: string;
        nomination_end_date: string;
        voting_start_date: string;
        voting_end_date: string;
      };
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const election = await this.electionsService.createBoardElection({
      title: electionData.title,
      description: electionData.description,
      tenant_id: currentUser.tenant_id,
      created_by: currentUser.sub,
      positions: electionData.positions,
      voting_schedule: {
        nomination_start_date: new Date(electionData.voting_schedule.nomination_start_date),
        nomination_end_date: new Date(electionData.voting_schedule.nomination_end_date),
        voting_start_date: new Date(electionData.voting_schedule.voting_start_date),
        voting_end_date: new Date(electionData.voting_schedule.voting_end_date),
      },
    });
    return {
      success: true,
      data: election,
      message: 'Board election created successfully',
    };
  }

  @Post('create-budget-approval')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @ApiOperation({ summary: 'Create budget approval vote' })
  @ApiResponse({ status: 201, description: 'Budget approval created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async createBudgetApproval(
    @Body() electionData: {
      title: string;
      description: string;
      budget_details: any;
      voting_schedule: {
        voting_start_date: string;
        voting_end_date: string;
      };
    },
    @Request() req: any,
  ): Promise<ApiResponseDto<any>> {
    const currentUser = req.user as JwtPayload;
    const election = await this.electionsService.createBudgetApproval({
      title: electionData.title,
      description: electionData.description,
      tenant_id: currentUser.tenant_id,
      created_by: currentUser.sub,
      budget_details: electionData.budget_details,
      voting_schedule: {
        voting_start_date: new Date(electionData.voting_schedule.voting_start_date),
        voting_end_date: new Date(electionData.voting_schedule.voting_end_date),
      },
    });
    return {
      success: true,
      data: election,
      message: 'Budget approval created successfully',
    };
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @ApiOperation({ summary: 'Update election' })
  @ApiResponse({ status: 200, description: 'Election updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Election not found' })
  async update(
    @Param('id') id: string,
    @Body() updateElectionDto: UpdateElectionDto,
  ): Promise<ApiResponseDto<any>> {
    const election = await this.electionsService.update(id, updateElectionDto);
    return {
      success: true,
      data: election,
      message: 'Election updated successfully',
    };
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN, UserRole.ADMIN_HEAD, UserRole.BOARD_MEMBER)
  @TenantRequired()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete election' })
  @ApiResponse({ status: 200, description: 'Election deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Election not found' })
  async remove(@Param('id') id: string): Promise<ApiResponseDto<void>> {
    await this.electionsService.remove(id);
    return {
      success: true,
      message: 'Election deleted successfully',
    };
  }
}